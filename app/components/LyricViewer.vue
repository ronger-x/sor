<template>
  <div
    ref="container"
    :class="[
      hideScrollbar ? 'hide-scrollbar' : '',
      'lyrics-container overflow-auto p-4 custom-scrollbar',
      { scrolling: isScrolling }
    ]"
    @click.stop=""
  >
    <div
      v-for="(line, i) in lyrics"
      :key="i"
      :ref="(el: HTMLElement | null) => (lineRefs[i] = el)"
      :class="['lyric-line py-1 transition-all', { 'lyric-active': i === currentLine }]"
      @click="onLineClick(line)"
      role="button"
      tabindex="0"
    >
      {{ line.text || ' ' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick, watch } from 'vue'
import { useSongsStore } from '@/stores/songs'

const songsStore = useSongsStore()
const lyrics = computed(() => songsStore.parsedLyrics)
const currentLine = computed(() => songsStore.currentLyricLine)
const hideScrollbar = true
const autoScroll = true
const centerOnActive = true
// 需要传递播放器 audioRef 进来，或通过 props/inject 获取
import { inject } from 'vue'
const audioRef = inject<Ref<HTMLAudioElement | null>>('audioRef', ref(null))

const container = ref<HTMLElement | null>(null)
const lineRefs: Record<number, HTMLElement | null> = {}
// currentLine 由 pinia 管理
const isScrolling = ref(false)
let scrollTimeout: number | null = null
let scrollHandler: (() => void) | null = null

async function scrollToLine(idx: number) {
  if (!autoScroll || !container.value) return
  await nextTick() // 确保 DOM 已更新
  const el = lineRefs[idx]
  if (!el) return
  if (centerOnActive) {
    el.scrollIntoView({ behavior: 'auto', block: 'center' })
  } else {
    el.scrollIntoView({ behavior: 'auto', block: 'nearest' })
  }
  // show scrollbar while programmatic scrolling occurs
  showScrollbarTemporary()
}

function showScrollbarTemporary() {
  isScrolling.value = true
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  // hide after 800ms of no scroll activity
  scrollTimeout = window.setTimeout(() => {
    isScrolling.value = false
    scrollTimeout = null
  }, 800) as unknown as number
}

// 每次 currentLine 变化时，自动滚动到对应歌词行
watch(currentLine, idx => {
  scrollToLine(idx)
})

onMounted(() => {
  if (container.value) {
    scrollHandler = () => showScrollbarTemporary()
    container.value.addEventListener('scroll', scrollHandler)
  }
})

onBeforeUnmount(() => {
  if (container.value && scrollHandler) {
    container.value.removeEventListener('scroll', scrollHandler)
    scrollHandler = null
  }
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
    scrollTimeout = null
  }
})

function onLineClick(line: { time: number; text: string }) {
  if (!line || typeof line.time !== 'number') return
  // 歌词跳转播放
  songsStore.seekTo(line.time, audioRef?.value ?? undefined)
}
</script>

<style scoped>
.lyrics-container {
  /* fill parent (the slide-over body provides height via flex) */
  height: 100%;
  max-height: none;
  min-height: 0;
}
.lyric-line {
  color: #444;
  font-size: 1rem;
  text-align: center;
}
.lyric-active {
  color: #0ea5a4;
  font-weight: 700;
  font-size: 1.15rem;
}
.hide-scrollbar {
  /* Firefox */
  scrollbar-width: none;
}
/* hide when not scrolling; when .scrolling class present we'll show it */
.hide-scrollbar:not(.scrolling)::-webkit-scrollbar {
  width: 0;
  height: 0;
}
/* tasteful thin scrollbar when not hidden */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  opacity: 0;
  transition: opacity 0.12s;
}
/* show while hovering or while actively scrolling */
.custom-scrollbar:hover::-webkit-scrollbar,
.custom-scrollbar.scrolling::-webkit-scrollbar,
.custom-scrollbar:active::-webkit-scrollbar,
.custom-scrollbar:focus::-webkit-scrollbar,
.custom-scrollbar:focus-within::-webkit-scrollbar {
  opacity: 1;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}
.custom-scrollbar {
  scrollbar-color: rgba(0, 0, 0, 0.12) transparent;
  scrollbar-width: thin;
}
</style>
