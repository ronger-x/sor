<template>
  <div class="h-screen flex flex-col">
    <!-- 歌词内容区域 -->
    <div class="flex-1 overflow-hidden">
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
