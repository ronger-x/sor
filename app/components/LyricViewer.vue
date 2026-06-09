<template>
  <div :class="viewerClasses" :style="viewerStyle">
    <!-- 左侧黑胶唱片区域 - 占据50%宽度 -->
    <div class="vinyl-section flex items-center justify-center">
      <div class="vinyl-wrapper">
        <!-- 白色底座 -->
        <div class="vinyl-base">
          <!-- 黑胶唱片 -->
          <div
            :class="[
              'vinyl-record relative',
              { 'vinyl-playing': isPlaying, 'vinyl-paused': !isPlaying }
            ]"
          >
            <!-- 封面图片 -->
            <div class="vinyl-cover">
              <NuxtImg
                :src="currentSong?.cover || defaultCover"
                :alt="currentSong?.name || '当前歌曲'"
                class="w-full h-full object-cover rounded-full"
                loading="eager"
              />
            </div>

            <!-- 黑胶唱片纹理 -->
            <div class="vinyl-grooves"></div>
          </div>

          <!-- 唱针 -->
          <div
            :class="['tonearm', { 'tonearm-playing': isPlaying, 'tonearm-resting': !isPlaying }]"
          >
            <div class="tonearm-base"></div>
            <div class="tonearm-arm"></div>
            <div class="tonearm-head"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧歌词内容区域 - 使用 flex-1 自动填充剩余空间 -->
    <div class="lyrics-section flex flex-col">
      <!-- 加载状态 -->
      <div v-if="lyricsLoading" class="flex items-center justify-center h-full">
        <div class="text-center">
          <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl mb-2" />
          <p class="text-sm text-gray-500">加载歌词中...</p>
        </div>
      </div>

      <!-- 无歌词状态 -->
      <div
        v-else-if="!currentSong || !lyrics || lyrics.length === 0"
        class="flex items-center justify-center h-full"
      >
        <div class="text-center text-gray-500">
          <UIcon name="i-lucide-music" class="text-4xl mb-2" />
          <p>{{ currentSong ? '暂无歌词' : '还没有播放歌曲' }}</p>
        </div>
      </div>

      <!-- 歌词列表 -->
      <div
        v-else
        ref="container"
        :class="[
          hideScrollbar ? 'hide-scrollbar' : '',
          'lyrics-container overflow-auto custom-scrollbar',
          { scrolling: isScrolling }
        ]"
        @click.stop=""
      >
        <template v-for="(line, i) in lyrics" :key="i">
          <div
            v-if="line.text"
            :ref="setLineRefFor(i)"
            :class="[
              'lyric-line py-2 transition-all duration-300 cursor-pointer',
              {
                'lyric-active': i === currentLine,
                'opacity-50': i !== currentLine
              }
            ]"
            @click="onLineClick(line)"
            @keydown.enter.prevent="onLineClick(line)"
            @keydown.space.prevent="onLineClick(line)"
            role="button"
            tabindex="0"
          >
            {{ line.text || '' }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useSongsStore } from '@/stores/songs'
import { useRouter } from 'vue-router'
import type { LyricViewMode } from '@/types'

const songsStore = useSongsStore()
const router = useRouter()
const props = withDefaults(
  defineProps<{
    mode?: LyricViewMode
    embedded?: boolean
    redirectOnEmpty?: boolean
  }>(),
  {
    mode: 'vinyl',
    embedded: false,
    redirectOnEmpty: true
  }
)

// ========== Store 状态（使用 computed 确保响应式） ==========
const lyrics = computed(() => songsStore.parsedLyrics)
const currentLine = computed(() => songsStore.currentLyricLine)
const lyricsLoading = computed(() => songsStore.lyricsLoading)
const currentSong = computed(() => songsStore.currentSong)
const isPlaying = computed(() => songsStore.isPlaying)
const defaultCover = '/favicon.ico'
const coverImage = computed(() => currentSong.value?.cover || defaultCover)
const viewerClasses = computed(() => [
  'lyric-viewer',
  'w-full',
  'h-full',
  'min-h-0',
  'flex',
  `lyric-viewer--${props.mode}`,
  {
    'lyric-viewer--embedded': props.embedded,
    'lyric-viewer--standalone': !props.embedded
  }
])
const coverPalette = ref(createFallbackPalette('S.O.R Music'))
const viewerStyle = computed<Record<string, string>>(() => ({
  '--lyric-cover-image': `url(${JSON.stringify(coverImage.value)})`,
  '--lyric-bg-rgb': coverPalette.value.background.join(' '),
  '--lyric-accent-rgb': coverPalette.value.accent.join(' '),
  '--lyric-foreground-rgb': coverPalette.value.foreground.join(' ')
}))

// ========== 组件状态 ==========
const hideScrollbar = ref(true)
const autoScroll = ref(true)
const centerOnActive = ref(true)
const container = ref<HTMLElement | null>(null)
const lineRefs = ref<Map<number, HTMLElement>>(new Map())
const isScrolling = ref(false)

let scrollTimeout: number | null = null
let scrollHandler: (() => void) | null = null
let paletteToken = 0

interface CoverPalette {
  background: [number, number, number]
  accent: [number, number, number]
  foreground: [number, number, number]
}

/**
 * 设置歌词行的 ref
 */
type TemplateRefValue = Element | ComponentPublicInstance | null

function asHTMLElement(el: TemplateRefValue): HTMLElement | null {
  if (el instanceof HTMLElement) return el
  const maybeElement = el && '$el' in el ? el.$el : null
  return maybeElement instanceof HTMLElement ? maybeElement : null
}

function setLineRef(index: number, el: TemplateRefValue) {
  const element = asHTMLElement(el)
  if (element) {
    lineRefs.value.set(index, element)
  } else {
    lineRefs.value.delete(index)
  }
}

function setLineRefFor(index: number) {
  return (el: TemplateRefValue) => setLineRef(index, el)
}

/**
 * 返回首页
 */
function goHome() {
  router.push('/')
}

/**
 * 滚动到指定歌词行
 */
async function scrollToLine(idx: number) {
  if (!autoScroll.value || !container.value) return
  await nextTick()

  const el = lineRefs.value.get(idx)
  if (!el) return

  if (centerOnActive.value) {
    const containerRect = container.value.getBoundingClientRect()
    const lineRect = el.getBoundingClientRect()
    const targetTop =
      container.value.scrollTop +
      lineRect.top -
      containerRect.top -
      container.value.clientHeight / 2 +
      lineRect.height / 2
    const maxTop = Math.max(0, container.value.scrollHeight - container.value.clientHeight)

    container.value.scrollTo({
      top: Math.min(Math.max(targetTop, 0), maxTop),
      behavior: 'smooth'
    })
  } else {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  showScrollbarTemporary()
}

/**
 * 临时显示滚动条
 */
function showScrollbarTemporary() {
  isScrolling.value = true
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  scrollTimeout = window.setTimeout(() => {
    isScrolling.value = false
    scrollTimeout = null
  }, 800) as unknown as number
}

/**
 * 监听当前歌词行变化，自动滚动
 */
watch(
  currentLine,
  newIdx => {
    if (newIdx !== undefined && newIdx >= 0) {
      scrollToLine(newIdx)
    }
  },
  { immediate: false }
)

watch(
  () => lyrics.value.length,
  length => {
    if (length > 0 && currentLine.value >= 0) {
      void scrollToLine(currentLine.value)
    }
  },
  { flush: 'post' }
)

/**
 * 监听歌曲变化，重新加载歌词
 */
watch(
  currentSong,
  async (newSong, oldSong) => {
    if (newSong && newSong !== oldSong) {
      // 重置滚动位置
      if (container.value) {
        container.value.scrollTop = 0
      }
      lineRefs.value.clear()

      // 如果还没有歌词，加载歌词
      if (lyrics.value.length === 0) {
        await songsStore.showCurrentLyrics()
      }
    }
  },
  { immediate: true }
)

watch(
  [coverImage, () => currentSong.value?.name, () => currentSong.value?.artist],
  ([src, name, artist]) => {
    void updateCoverPalette(src, [name, artist].filter(Boolean).join('-') || src)
  },
  { immediate: true }
)

/**
 * 组件挂载
 */
onMounted(async () => {
  // 确保有当前歌曲
  if (!currentSong.value) {
    if (props.redirectOnEmpty) {
      console.warn('No current song, redirecting to home')
      goHome()
    }
    return
  }

  // 如果没有歌词，加载歌词
  if (lyrics.value.length === 0) {
    await songsStore.showCurrentLyrics()
  }
  await scrollToLine(currentLine.value)

  // 添加滚动监听
  if (container.value) {
    scrollHandler = () => showScrollbarTemporary()
    container.value.addEventListener('scroll', scrollHandler, { passive: true })
  }

  // 确保 audio 元素已初始化并开始同步
  const audio = songsStore.getAudio()
  if (audio && isPlaying.value) {
    songsStore.startLyricSync()
  }
})

/**
 * 组件卸载
 */
onBeforeUnmount(() => {
  if (container.value && scrollHandler) {
    container.value.removeEventListener('scroll', scrollHandler)
    scrollHandler = null
  }
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
    scrollTimeout = null
  }

  // 清理 refs
  lineRefs.value.clear()
})

/**
 * 点击歌词行，跳转到对应时间
 */
function onLineClick(line: { time: number; text: string }) {
  if (!line || line.time === undefined) return

  // 使用 store 的 seekTo 方法（会自动开始播放）
  songsStore.seekTo(line.time)
  void scrollToLine(currentLine.value)
}

async function updateCoverPalette(src: string, seed: string) {
  const token = ++paletteToken
  coverPalette.value = createFallbackPalette(seed)

  if (!import.meta.client || !src) return

  try {
    const img = await loadPaletteImage(src)
    const palette = sampleImagePalette(img)
    if (token === paletteToken) {
      coverPalette.value = palette
    }
  } catch {
    if (token === paletteToken) {
      coverPalette.value = createFallbackPalette(seed)
    }
  }
}

function loadPaletteImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.referrerPolicy = 'no-referrer'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function sampleImagePalette(img: HTMLImageElement): CoverPalette {
  const canvas = document.createElement('canvas')
  const size = 36
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas is not available')

  ctx.drawImage(img, 0, 0, size, size)
  const pixels = ctx.getImageData(0, 0, size, size).data
  let r = 0
  let g = 0
  let b = 0
  let weightTotal = 0
  let accentScore = -1
  let accent: [number, number, number] = [96, 165, 250]

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255
    if (alpha < 0.35) continue

    const pr = pixels[i]
    const pg = pixels[i + 1]
    const pb = pixels[i + 2]
    const max = Math.max(pr, pg, pb)
    const min = Math.min(pr, pg, pb)
    const saturation = max === 0 ? 0 : (max - min) / max
    const brightness = max / 255
    const whitePenalty = brightness > 0.88 && saturation < 0.12 ? 0.18 : 1
    const weight = alpha * (1 + saturation * 2.2) * whitePenalty

    r += pr * weight
    g += pg * weight
    b += pb * weight
    weightTotal += weight

    const score = saturation * 1.8 + (1 - Math.abs(brightness - 0.56))
    if (score > accentScore && brightness > 0.18) {
      accentScore = score
      accent = [pr, pg, pb]
    }
  }

  if (!weightTotal) throw new Error('No visible pixels')

  const average: [number, number, number] = [
    Math.round(r / weightTotal),
    Math.round(g / weightTotal),
    Math.round(b / weightTotal)
  ]
  const background = normalizeBackground(average)
  return {
    background,
    accent: normalizeAccent(accent),
    foreground: relativeLuminance(background) > 0.42 ? [17, 24, 39] : [248, 250, 252]
  }
}

function createFallbackPalette(seed: string): CoverPalette {
  const hue = hashString(seed || 'sor') % 360
  const background = hslToRgb(hue, 42, 22)
  return {
    background,
    accent: hslToRgb((hue + 28) % 360, 72, 62),
    foreground: [248, 250, 252]
  }
}

function normalizeBackground(rgb: [number, number, number]): [number, number, number] {
  const lum = relativeLuminance(rgb)
  if (lum > 0.45) return mixRgb(rgb, [12, 18, 28], 0.58)
  if (lum < 0.08) return mixRgb(rgb, [30, 38, 56], 0.32)
  return mixRgb(rgb, [12, 18, 28], 0.28)
}

function normalizeAccent(rgb: [number, number, number]): [number, number, number] {
  const lum = relativeLuminance(rgb)
  if (lum < 0.22) return mixRgb(rgb, [255, 255, 255], 0.38)
  if (lum > 0.78) return mixRgb(rgb, [24, 32, 45], 0.22)
  return rgb
}

function relativeLuminance([r, g, b]: [number, number, number]) {
  const linear = [r, g, b].map(value => {
    const v = value / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function mixRgb(
  from: [number, number, number],
  to: [number, number, number],
  ratio: number
): [number, number, number] {
  return [
    Math.round(from[0] * (1 - ratio) + to[0] * ratio),
    Math.round(from[1] * (1 - ratio) + to[1] * ratio),
    Math.round(from[2] * (1 - ratio) + to[2] * ratio)
  ]
}

function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  const s = saturation / 100
  const l = lightness / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0

  if (hue < 60) [r, g, b] = [c, x, 0]
  else if (hue < 120) [r, g, b] = [x, c, 0]
  else if (hue < 180) [r, g, b] = [0, c, x]
  else if (hue < 240) [r, g, b] = [0, x, c]
  else if (hue < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ]
}

function hashString(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}
</script>

<style scoped>
.lyric-viewer {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 20%, rgb(var(--lyric-accent-rgb) / 0.26), transparent 34%),
    radial-gradient(circle at 78% 14%, rgb(var(--lyric-accent-rgb) / 0.14), transparent 28%),
    linear-gradient(135deg, rgb(var(--lyric-bg-rgb) / 0.98), color-mix(in oklab, rgb(var(--lyric-bg-rgb)) 72%, black));
  color: rgb(var(--lyric-foreground-rgb));
}

.lyric-viewer::before {
  content: '';
  position: absolute;
  inset: -12%;
  z-index: -2;
  background-image: var(--lyric-cover-image);
  background-position: center;
  background-size: cover;
  filter: blur(42px) saturate(1.28);
  opacity: 0.38;
  transform: scale(1.08);
}

.lyric-viewer::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(90deg, rgb(0 0 0 / 0.26), rgb(0 0 0 / 0.08) 42%, rgb(0 0 0 / 0.36)),
    radial-gradient(circle at center, transparent, rgb(0 0 0 / 0.28));
  pointer-events: none;
}

/* ========== 黑胶唱片样式 ========== */
.vinyl-section {
  width: 50%; /* 占据50%宽度 */
  height: var(--lyric-viewer-height, 100vh); /* 固定高度为视口高度 */
  flex-shrink: 0; /* 不被压缩 */
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden; /* 防止内容溢出 */
}

/* 唱片包裹容器 - 保持固定尺寸 */
.vinyl-wrapper {
  position: relative;
  width: 380px;
  height: 380px;
  flex-shrink: 0; /* 防止被压缩 */
}

/* 白色底座 */
.vinyl-base {
  position: relative;
  width: 100%;
  height: 100%;
  background:
    linear-gradient(145deg, rgb(255 255 255 / 0.88), rgb(255 255 255 / 0.68)),
    rgb(var(--lyric-accent-rgb) / 0.18);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.28), 0 8px 24px rgb(var(--lyric-accent-rgb) / 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.vinyl-record {
  width: 300px;
  height: 300px;
  flex-shrink: 0; /* 防止被压缩 */
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, rgba(80, 80, 80, 0.3) 0%, transparent 50%),
    radial-gradient(circle at center, #2a2a2a 0%, #1a1a1a 40%, #0a0a0a 70%, #1a1a1a 100%);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.8), 0 12px 32px rgba(0, 0, 0, 0.4),
    0 4px 12px rgba(0, 0, 0, 0.3), inset 0 0 40px rgba(0, 0, 0, 0.6),
    inset 0 2px 4px rgba(255, 255, 255, 0.05);
  position: relative;
  transition: transform 0.3s ease;
}

.vinyl-record::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 60%),
    radial-gradient(circle at 70% 70%, rgba(0, 0, 0, 0.2) 0%, transparent 50%);
}

.vinyl-record::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(255, 255, 255, 0.02) 45deg,
    transparent 90deg,
    rgba(255, 255, 255, 0.02) 135deg,
    transparent 180deg,
    rgba(255, 255, 255, 0.02) 225deg,
    transparent 270deg,
    rgba(255, 255, 255, 0.02) 315deg,
    transparent 360deg
  );
}

/* 封面图片 */
.vinyl-cover {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 190px;
  height: 190px;
  border-radius: 50%;
  overflow: hidden;
  z-index: 2;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 黑胶纹理 */
.vinyl-grooves {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: repeating-radial-gradient(
    circle at center,
    transparent 0px,
    transparent 1.5px,
    rgba(255, 255, 255, 0.02) 1.5px,
    rgba(255, 255, 255, 0.02) 3px
  );
  pointer-events: none;
  z-index: 1;
}

/* 旋转动画 */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.vinyl-playing {
  animation: spin 3s linear infinite;
}

.vinyl-paused {
  animation-play-state: paused;
}

/* 唱针样式 */
.tonearm {
  position: absolute;
  top: 10px;
  right: -40px;
  width: 180px;
  height: 180px;
  transform-origin: 85% 30px;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 5;
}

/* 唱针基座 */
.tonearm-base {
  position: absolute;
  top: 30px;
  right: 28px;
  width: 32px;
  height: 32px;
  background: radial-gradient(circle at 30% 30%, #e0e0e0, #b0b0b0);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.5),
    inset 0 -1px 2px rgba(0, 0, 0, 0.3);
}

.tonearm-base::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  background: radial-gradient(circle, #999, #666);
  border-radius: 50%;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* 唱针臂 */
.tonearm-arm {
  position: absolute;
  top: 40px;
  right: 44px;
  width: 120px;
  height: 6px;
  background: linear-gradient(to bottom, #d0d0d0, #a0a0a0, #888);
  border-radius: 3px;
  transform-origin: right center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.tonearm-arm::before {
  content: '';
  position: absolute;
  left: -3px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  background: radial-gradient(circle at 30% 30%, #c0c0c0, #888);
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.4);
}

/* 唱针头 */
.tonearm-head {
  position: absolute;
  top: 33px;
  right: 162px;
  width: 14px;
  height: 24px;
  background: linear-gradient(to right, #b0b0b0, #888, #b0b0b0);
  border-radius: 3px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.tonearm-head::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 8px solid #666;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.3));
}

/* 唱针状态 */
.tonearm-resting {
  transform: rotate(-30deg);
}

.tonearm-playing {
  transform: rotate(-3deg);
}

/* ========== 歌词区域样式 ========== */
.lyrics-section {
  width: 50%; /* 占据50%宽度 */
  height: var(--lyric-viewer-height, 100vh); /* 固定高度为视口高度 */
  flex-shrink: 0; /* 不被压缩 */
  overflow: hidden; /* 防止内容溢出到父容器外 */
  padding: 2rem; /* 添加内边距 */
  display: flex;
  flex-direction: column;
  color: rgb(var(--lyric-foreground-rgb));
}

.lyric-viewer--embedded {
  --lyric-viewer-height: 100%;
  min-height: 0;
  height: 100%;
}

.lyric-viewer--embedded .vinyl-section,
.lyric-viewer--embedded .lyrics-section {
  height: auto;
  min-height: 0;
}

.lyric-viewer--focus .vinyl-section,
.lyric-viewer--compact .vinyl-section {
  display: none;
}

.lyric-viewer--focus .lyrics-section {
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
}

.lyric-viewer--compact .lyrics-section {
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 1rem;
}

.lyric-viewer--compact .lyric-line {
  font-size: 0.9375rem;
  line-height: 1.65;
  padding: 0.45rem 0.75rem;
}

.lyric-viewer--compact .lyric-active {
  font-size: 1.125rem;
}

/* 歌词容器 */
.lyrics-container {
  flex: 1; /* 占满父容器剩余空间 */
  width: 100%; /* 确保宽度不超出父容器 */
  max-width: 100%; /* 限制最大宽度 */
  overflow-y: auto; /* 只在垂直方向滚动 */
  overflow-x: hidden; /* 隐藏水平滚动 */
  scroll-behavior: smooth;
  padding: max(34vh, 8rem) 1rem; /* 确保首尾歌词都能居中 */
  mask-image: linear-gradient(to bottom, transparent, black 14%, black 86%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 14%, black 86%, transparent);
}

.lyric-line {
  font-size: 1.125rem; /* 18px */
  text-align: center;
  line-height: 1.8;
  color: rgb(var(--lyric-foreground-rgb) / 0.7);
  text-shadow: 0 1px 16px rgb(0 0 0 / 0.28);
  transition:
    color 0.3s ease,
    font-size 0.3s ease,
    opacity 0.3s ease,
    transform 0.3s ease;
  padding: 0.75rem 1rem; /* 增加行高和内边距 */
  word-wrap: break-word; /* 长单词换行 */
  overflow-wrap: break-word; /* 确保文本换行 */
}

.lyric-line:hover {
  opacity: 1 !important;
  transform: scale(1.02);
}

.lyric-active {
  color: rgb(var(--lyric-accent-rgb));
  font-weight: 700;
  font-size: 1.5rem; /* 24px */
  opacity: 1 !important;
  text-shadow:
    0 1px 18px rgb(0 0 0 / 0.38),
    0 0 34px rgb(var(--lyric-accent-rgb) / 0.36);
}

.hide-scrollbar {
  scrollbar-width: none;
}

.hide-scrollbar:not(.scrolling)::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  opacity: 0;
  transition: opacity 0.3s;
}

.custom-scrollbar:hover::-webkit-scrollbar,
.custom-scrollbar.scrolling::-webkit-scrollbar,
.custom-scrollbar:active::-webkit-scrollbar,
.custom-scrollbar:focus::-webkit-scrollbar,
.custom-scrollbar:focus-within::-webkit-scrollbar {
  opacity: 1;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.3);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.5);
}

/* ========== 响应式设计 ========== */
@media (max-width: 1536px) {
  .vinyl-wrapper {
    width: 340px;
    height: 340px;
  }

  .vinyl-base {
    padding: 35px;
  }

  .vinyl-record {
    width: 270px;
    height: 270px;
  }

  .vinyl-cover {
    width: 170px;
    height: 170px;
  }
}

@media (max-width: 1280px) {
  .vinyl-wrapper {
    width: 320px;
    height: 320px;
  }

  .vinyl-base {
    padding: 30px;
  }

  .vinyl-record {
    width: 260px;
    height: 260px;
  }

  .vinyl-cover {
    width: 160px;
    height: 160px;
  }

  .tonearm {
    width: 160px;
    height: 160px;
  }

  .tonearm-arm {
    width: 110px;
  }

  .lyric-line {
    font-size: 1rem; /* 16px */
  }

  .lyric-active {
    font-size: 1.375rem; /* 22px */
  }
}

@media (max-width: 1024px) {
  .vinyl-wrapper {
    width: 280px;
    height: 280px;
  }

  .vinyl-base {
    padding: 25px;
  }

  .vinyl-record {
    width: 230px;
    height: 230px;
  }

  .vinyl-cover {
    width: 140px;
    height: 140px;
  }

  .tonearm {
    width: 150px;
    height: 150px;
    right: -30px;
  }

  .tonearm-arm {
    width: 100px;
  }

  .lyrics-section {
    padding: 1.5rem;
  }

  .lyric-line {
    font-size: 0.9375rem; /* 15px */
  }

  .lyric-active {
    font-size: 1.25rem; /* 20px */
  }
}

@media (max-width: 768px) {
  .vinyl-section {
    display: none;
  }

  .lyrics-section {
    width: 100%;
    height: 100dvh; /* 移动端占满全屏高度 */
    padding: 1rem;
  }

  .lyric-line {
    font-size: 0.875rem; /* 14px */
  }

  .lyric-active {
    font-size: 1.125rem; /* 18px */
  }
}
</style>
