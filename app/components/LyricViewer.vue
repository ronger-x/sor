<template>
  <div class="h-screen flex flex-row">
    <!-- 左侧黑胶唱片区域 - 固定宽度避免被右侧影响 -->
    <div class="vinyl-section shrink-0 flex items-center p-12">
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
                v-if="currentSong?.cover"
                :src="currentSong.cover"
                :alt="currentSong.name"
                class="w-full h-full object-cover rounded-full"
                loading="eager"
              />
              <div
                v-else
                class="w-full h-full bg-linear-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center"
              >
                <UIcon name="i-lucide-music" class="text-6xl text-white opacity-50" />
              </div>
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

    <!-- 右侧歌词内容区域 -->
    <div class="flex-1 overflow-hidden flex flex-col pl-12">
      <!-- 加载状态 -->
      <div v-if="lyricsLoading" class="flex items-center justify-center h-full">
        <div class="text-center">
          <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl mb-2" />
          <p class="text-sm text-gray-500">加载歌词中...</p>
        </div>
      </div>

      <!-- 无歌词状态 -->
      <div
        v-else-if="!lyrics || lyrics.length === 0"
        class="flex items-center justify-center h-full"
      >
        <div class="text-center text-gray-500">
          <UIcon name="i-lucide-music" class="text-4xl mb-2" />
          <p>暂无歌词</p>
        </div>
      </div>

      <!-- 歌词列表 -->
      <div
        v-else
        ref="container"
        :class="[
          hideScrollbar ? 'hide-scrollbar' : '',
          'lyrics-container overflow-auto p-4 custom-scrollbar',
          { scrolling: isScrolling }
        ]"
        @click.stop=""
      >
        <template v-for="(line, i) in lyrics" :key="i">
          <div
            v-if="line.text"
            :ref="el => setLineRef(i, el)"
            :class="[
              'lyric-line py-2 transition-all duration-300 cursor-pointer',
              {
                'text-primary lyric-active': i === currentLine,
                'opacity-50': i !== currentLine
              }
            ]"
            @click="onLineClick(line)"
            role="button"
            tabindex="0"
          >
            {{ line.text || '' }}
          </div>
        </template>

        <!-- 底部留白，确保最后一句歌词可以滚动到中间 -->
        <div class="h-[50vh]"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick, watch } from 'vue'
import { useSongsStore } from '@/stores/songs'
import { useRouter } from 'vue-router'

const songsStore = useSongsStore()
const router = useRouter()

// ========== Store 状态（使用 computed 确保响应式） ==========
const lyrics = computed(() => songsStore.parsedLyrics)
const currentLine = computed(() => songsStore.currentLyricLine)
const lyricsLoading = computed(() => songsStore.lyricsLoading)
const currentSong = computed(() => songsStore.currentSong)
const isPlaying = computed(() => songsStore.isPlaying)

// ========== 组件状态 ==========
const hideScrollbar = ref(true)
const autoScroll = ref(true)
const centerOnActive = ref(true)
const container = ref<HTMLElement | null>(null)
const lineRefs = ref<Map<number, HTMLElement>>(new Map())
const isScrolling = ref(false)

let scrollTimeout: number | null = null
let scrollHandler: (() => void) | null = null

/**
 * 设置歌词行的 ref
 */
function setLineRef(index: number, el: any) {
  if (el) {
    lineRefs.value.set(index, el as HTMLElement)
  } else {
    lineRefs.value.delete(index)
  }
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
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
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

/**
 * 组件挂载
 */
onMounted(async () => {
  // 确保有当前歌曲
  if (!currentSong.value) {
    console.warn('No current song, redirecting to home')
    goHome()
    return
  }

  // 如果没有歌词，加载歌词
  if (lyrics.value.length === 0) {
    await songsStore.showCurrentLyrics()
  }

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

  // 使用 store 的 seekTo 方法
  songsStore.seekTo(line.time)

  // 如果当前是暂停状态，开始播放
  if (!isPlaying.value) {
    songsStore.togglePlay()
  }
}
</script>

<style scoped>
/* ========== 黑胶唱片样式 ========== */
.vinyl-section {
  width: 70%; /* 固定宽度，避免右侧内容影响 */
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.01) 100%);
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
  background: linear-gradient(145deg, #ffffff, #f5f5f5);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1),
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

/* 中心标签 */
.vinyl-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #3a3a3a 0%, #1a1a1a 100%);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.6), inset 0 1px 3px rgba(255, 255, 255, 0.15),
    inset 0 -1px 3px rgba(0, 0, 0, 0.5);
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vinyl-label-inner {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
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

/* 响应式设计 */
@media (max-width: 1280px) {
  .vinyl-section {
    width: 420px;
  }

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

  .vinyl-label {
    width: 75px;
    height: 75px;
  }

  .vinyl-label-inner {
    width: 58px;
    height: 58px;
  }
}

@media (max-width: 1024px) {
  .vinyl-section {
    width: 360px;
  }

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
}

@media (max-width: 768px) {
  .vinyl-section {
    display: none;
  }
}

/* ========== 歌词样式 ========== */
.lyrics-container {
  height: 100%;
  max-height: none;
  min-height: 0;
  scroll-behavior: smooth;
}

.lyric-line {
  font-size: 1rem;
  text-align: center;
  line-height: 1.2;
  transition: all 0.3s ease;
}

.lyric-line:hover {
  opacity: 1 !important;
  transform: scale(1.02);
}

.lyric-active {
  font-weight: 700;
  font-size: 1.25rem;
  opacity: 1 !important;
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
</style>
