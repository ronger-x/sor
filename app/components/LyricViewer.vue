<template>
  <div
    ref="container"
    :class="[
      hideScrollbar ? 'hide-scrollbar' : '',
      'lyrics-container overflow-auto p-4 custom-scrollbar',
      { scrolling: isScrolling },
    ]"
    @click.stop=""
  >
    <div
      v-for="(line, i) in lyrics"
      :key="i"
      :ref="el => (lineRefs[i] = el as HTMLElement | null)"
      :class="[
        'lyric-line py-1 transition-all',
        { 'lyric-active': i === currentLine },
      ]"
      @click="onLineClick(line)"
      role="button"
      tabindex="0"
    >
      {{ line.text || " " }}
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  onBeforeUnmount,
  computed,
  nextTick,
  watch,
} from "vue";

interface LyricLine {
  time: number;
  text: string;
}

const props = defineProps<{
  lyrics: LyricLine[];
  audioRef?: HTMLAudioElement | null;
  currentTime?: number | null;
  autoScroll?: boolean;
  centerOnActive?: boolean;
  // delay (ms) to wait before advancing highlight to next line
  leadMs?: number;
  // hide scrollbar for cleaner UI
  hideScrollbar?: boolean;
}>();

const emit = defineEmits<{
  (e: "seek", timeMs: number): void;
  (e: "update:currentLine", idx: number): void;
}>();

const {
  lyrics,
  audioRef,
  currentTime,
  autoScroll = true,
  centerOnActive = true,
  leadMs = 300,
  hideScrollbar = true,
} = props as any;

const container = ref<HTMLElement | null>(null);
const lineRefs: Record<number, HTMLElement | null> = {};
const currentLine = ref<number>(0);
const isScrolling = ref(false);
let scrollTimeout: number | null = null;
let scrollHandler: (() => void) | null = null;

const times = computed(() => (lyrics || []).map((l: any) => l?.time ?? 0));

function findCurrentIndex(tMs: number) {
  if (!times.value.length) return 0;
  // Return the last line index whose time is <= current time.
  // This ensures the previous line remains highlighted until the next line's start time.
  for (let i = times.value.length - 1; i >= 0; i--) {
    if (tMs >= times.value[i]) {
      return i;
    }
  }
  // If current time is before the first timestamp, keep index 0
  return 0;
}

async function scrollToLine(idx: number) {
  if (!autoScroll || !container.value) return;
  await nextTick(); // 确保 DOM 已更新
  const el = lineRefs[idx];
  if (!el) return;
  if (centerOnActive) {
    el.scrollIntoView({ behavior: "auto", block: "center" });
  } else {
    el.scrollIntoView({ behavior: "auto", block: "nearest" });
  }
  // show scrollbar while programmatic scrolling occurs
  showScrollbarTemporary();
}

function showScrollbarTemporary() {
  isScrolling.value = true;
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  // hide after 800ms of no scroll activity
  scrollTimeout = window.setTimeout(() => {
    isScrolling.value = false;
    scrollTimeout = null;
  }, 800) as unknown as number;
}

let rafId: number | null = null;
function rafLoop() {
  const audioEl =
    audioRef && (audioRef as any).value ? (audioRef as any).value : audioRef;
  const t =
    typeof currentTime === "number"
      ? currentTime
      : audioEl && audioEl.currentTime
      ? audioEl.currentTime * 1000
      : 0;
  const idx = findCurrentIndex(t);
  if (idx !== currentLine.value) {
    currentLine.value = idx;
    emit("update:currentLine", idx);
  }
  rafId = requestAnimationFrame(rafLoop);
}

// 每次 currentLine 变化时，自动滚动到对应歌词行
watch(currentLine, (idx) => {
  scrollToLine(idx);
});

onMounted(() => {
  rafId = requestAnimationFrame(rafLoop);
  // attach scroll listener to show scrollbar while user scrolls
  if (container.value) {
    scrollHandler = () => showScrollbarTemporary();
    container.value.addEventListener("scroll", scrollHandler);
  }
});

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId);
  if (container.value && scrollHandler) {
    container.value.removeEventListener("scroll", scrollHandler);
    scrollHandler = null;
  }
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
    scrollTimeout = null;
  }
});

function onLineClick(line: LyricLine) {
  if (!line || typeof line.time !== "number") return;
  const seconds = line.time / 1000;
  const audioEl =
    audioRef && (audioRef as any).value ? (audioRef as any).value : audioRef;
  if (audioEl) {
    try {
      audioEl.currentTime = seconds;
      audioEl.play().catch(() => {});
    } catch (e) {}
  }
  emit("seek", line.time);
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
