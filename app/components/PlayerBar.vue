<template>
  <div :class="['card-surface', 'border-theme', ...containerClasses]">
    <div class="w-full space-y-2">
      <!-- 歌曲信息和控制按钮 -->
      <div class="relative flex items-center w-full">
        <img
          :src="currentSong?.cover"
          class="w-10 h-10 md:w-12 md:h-12 rounded mr-4"
          :alt="currentSong?.name"
        />
        <div class="flex-1 min-w-0">
          <div class="font-bold truncate">{{ currentSong?.name }}</div>
          <div class="text-sm truncate">{{ currentSong?.artist }}</div>
        </div>
        <div v-if="$device.isDesktop" :class="centerControlClasses" style="z-index: 20">
          <!-- Volume button: placed before lyrics -->
          <UPopover v-model:open="showVolume" placement="top-end">
            <UButton :icon="volumeIcon" variant="ghost" />
            <template #content>
              <USlider
                orientation="vertical"
                :model-value="Math.round((volume ?? 1) * 100)"
                @update:model-value="onSliderChange"
                class="h-48"
              />
            </template>
          </UPopover>
          <UButton
            icon="i-lucide-chevrons-left"
            variant="ghost"
            @click.stop="prevSong"
            :disabled="!hasPrev"
          />
          <UButton :icon="playPauseIcon" variant="solid" color="primary" @click.stop="togglePlay" />
          <UButton
            icon="i-lucide-chevrons-right"
            variant="ghost"
            @click.stop="nextSong"
            :disabled="!hasNext"
          />
          <UButton icon="i-lucide-music-4" variant="ghost" @click.stop="showLyrics" />
        </div>
        <!-- Mobile compact controls: show on non-desktop devices -->
        <div v-else class="flex items-center gap-2 ml-2 z-20">
          <!-- Mobile: volume button before lyrics -->
          <UPopover v-model:open="showVolume" placement="top-end">
            <UButton :icon="volumeIcon" variant="ghost" size="sm" />
            <template #content>
              <USlider
                orientation="vertical"
                :model-value="Math.round((volume ?? 1) * 100)"
                @update:model-value="onSliderChange"
                class="h-32"
              />
            </template>
          </UPopover>
          <UButton
            icon="i-lucide-chevrons-left"
            variant="ghost"
            size="sm"
            @click.stop="prevSong"
            :disabled="!hasPrev"
          />
          <UButton
            :icon="playPauseIcon"
            variant="solid"
            color="primary"
            size="sm"
            @click.stop="togglePlay"
          />
          <UButton
            icon="i-lucide-chevrons-right"
            variant="ghost"
            size="sm"
            @click.stop="nextSong"
            :disabled="!hasNext"
          />
          <UButton
            icon="i-lucide-music-4"
            variant="ghost"
            size="sm"
            @click.stop="showLyrics"
          />
        </div>
      </div>

      <!-- 播放进度条 -->
      <div
        class="flex items-center gap-3"
        :class="progressContainerClasses"
        :style="{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }"
      >
        <span class="text-xs tabular-nums min-w-[40px] text-right">
          {{ formatTime(currentTime) }}
        </span>
        <USlider
          :model-value="currentTime"
          :max="duration || 100"
          :step="0.1"
          class="flex-1"
          @update:model-value="onProgressChange"
        />
        <span class="text-xs tabular-nums min-w-[40px]">
          {{ formatTime(duration) }}
        </span>
      </div>
    </div>

    <audio
      ref="audioRef"
      :src="currentSong?.url"
      @ended="nextSong"
      @play="onAudioPlay"
      @pause="onAudioPause"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      style="display: none"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, provide, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useSongsStore } from '@/stores/songs'

const songsStore = useSongsStore()
const audioRef = ref<HTMLAudioElement | null>(null)
const showVolume = ref(false)
const isSeeking = ref(false)

// provide audioRef so other components (LyricViewer) can inject it
provide('audioRef', audioRef)

const router = useRouter()
const showLyricPage = computed(() => router.currentRoute.value.path === '/lyric')

// 使用 store 中的状态
const currentSong = computed(() => songsStore.currentSong)
const currentTime = computed(() => songsStore.currentTime)
const duration = computed(() => songsStore.duration)
const hasPrev = computed(() => songsStore.hasPrev)
const hasNext = computed(() => songsStore.hasNext)

const playPauseIcon = computed(() =>
  songsStore.isPlaying ? 'i-lucide-pause' : 'i-lucide-play'
)

// 格式化时间 (秒 -> mm:ss)
function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 音频时间更新
function onTimeUpdate() {
  if (!audioRef.value || isSeeking.value) return
  songsStore.updateProgress(
    audioRef.value.currentTime,
    audioRef.value.duration
  )
}

// 音频元数据加载完成
function onLoadedMetadata() {
  if (!audioRef.value) return
  songsStore.updateProgress(
    audioRef.value.currentTime,
    audioRef.value.duration
  )
}

// 进度条拖动
function onProgressChange(value: number | undefined) {
  if (value === undefined || !audioRef.value) return
  isSeeking.value = true
  songsStore.setProgress(value, audioRef.value)
  // 延迟重置 seeking 状态，避免跳动
  setTimeout(() => {
    isSeeking.value = false
  }, 100)
}

// 使用 store 的方法
function prevSong() {
  songsStore.playPrevSong(audioRef.value)
}

function nextSong() {
  songsStore.playNextSong(audioRef.value)
}

function togglePlay() {
  songsStore.togglePlay(audioRef.value)
}

function showLyrics() {
  if (showLyricPage.value) {
    router.push('/')
  } else {
    songsStore.showCurrentLyrics()
    router.push('/lyric')
  }
}

function onAudioPlay() {
  songsStore.isPlaying = true
}

function onAudioPause() {
  songsStore.isPlaying = false
}

// volume bindings
const volume = computed(() => songsStore.volume)
const muted = computed(() => songsStore.muted)
const volumeIcon = computed(() => {
  if (muted.value || (volume.value ?? 1) === 0) return 'i-lucide-volume-off'
  if ((volume.value ?? 1) < 0.5) return 'i-lucide-volume-1'
  return 'i-lucide-volume-2'
})

function onSliderChange(val: number | undefined) {
  if (val === undefined) return
  const v = Math.max(0, Math.min(100, Number(val))) / 100
  songsStore.setVolume(v, audioRef.value)
}

// 监听 currentSong 变化，自动播放
watch(currentSong, async (song, prev) => {
  if (song && song !== prev && audioRef.value) {
    const idx = songsStore.currentSongIndex
    if (idx !== -1) {
      await songsStore.playSong(idx, audioRef.value)
    }
  }
})

// 组件卸载时清理
onBeforeUnmount(() => {
  songsStore.stopLyricSync()
  if (audioRef.value) {
    audioRef.value.pause()
  }
})

const containerClasses = computed(() => [
  'fixed',
  'bottom-0',
  'left-0',
  'right-0',
  'w-full',
  'z-50',
  'shadow',
  'px-4',
  'py-3',
  'backdrop-blur'
])

const centerControlClasses = computed(() => [
  'absolute',
  'left-1/2',
  'top-1/2',
  '-translate-x-1/2',
  '-translate-y-1/2',
  'md:flex',
  'items-center',
  'gap-2',
  'px-2',
  'rounded'
])

// 进度条容器样式 - 根据设备类型调整宽度
const progressContainerClasses = computed(() => [
  'mx-auto', // 居中对齐
  // 桌面端：限制最大宽度，与按钮组对齐
  'md:max-w-[400px]', // 5个按钮的宽度 (约 40px * 5 + gap)
  'lg:max-w-[450px]',  // 大屏幕稍微放宽
  // 移动端：使用全宽但留出边距
  'max-w-full'
])
</script>
