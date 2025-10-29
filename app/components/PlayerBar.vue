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
                @update:model-value="onVolumeChange"
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
                @update:model-value="onVolumeChange"
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

    <!-- ⭐ Audio 元素：只负责渲染，初始化后交给 store 管理 -->
    <audio
      ref="audioElement"
      :src="currentSong?.url"
      @ended="onAudioEnded"
      @play="onAudioPlay"
      @pause="onAudioPause"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @error="onAudioError"
      style="display: none"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useSongsStore } from '@/stores/songs'

const songsStore = useSongsStore()
const router = useRouter()

// ⭐ 本地 ref，只用于获取 DOM 元素
const audioElement = ref<HTMLAudioElement | null>(null)
const showVolume = ref(false)
const isSeeking = ref(false)

const showLyricPage = computed(() => router.currentRoute.value.path === '/lyric')

// 使用 store 中的状态
const currentSong = computed(() => songsStore.currentSong)
const currentTime = computed(() => songsStore.currentTime)
const duration = computed(() => songsStore.duration)
const hasPrev = computed(() => songsStore.hasPrev)
const hasNext = computed(() => songsStore.hasNext)
const volume = computed(() => songsStore.volume)
const muted = computed(() => songsStore.muted)

const playPauseIcon = computed(() =>
  songsStore.isPlaying ? 'i-lucide-pause' : 'i-lucide-play'
)

const volumeIcon = computed(() => {
  if (muted.value || (volume.value ?? 1) === 0) return 'i-lucide-volume-off'
  if ((volume.value ?? 1) < 0.5) return 'i-lucide-volume-1'
  return 'i-lucide-volume-2'
})

// ⭐ 组件挂载时初始化 audio 元素到 store
onMounted(() => {
  if (audioElement.value) {
    songsStore.initAudio(audioElement.value)
    console.log('Audio element initialized in store')
  } else {
    console.warn('Failed to initialize audio element')
  }
})

// ⭐ 组件卸载时清理资源
onBeforeUnmount(() => {
  songsStore.stopLyricSync()
  // 注意：不要调用 dispose()，因为可能有其他组件还在使用
  // dispose 应该在应用级别（app.vue）调用
})

// 格式化时间 (秒 -> mm:ss)
function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// ⭐ Audio 事件处理器
function onTimeUpdate() {
  const audio = songsStore.getAudio()
  if (!audio || isSeeking.value) return
  songsStore.updateProgress(audio.currentTime, audio.duration)
}

function onLoadedMetadata() {
  const audio = songsStore.getAudio()
  if (!audio) return
  songsStore.updateProgress(audio.currentTime, audio.duration)
}

function onAudioPlay() {
  songsStore.isPlaying = true
}

function onAudioPause() {
  songsStore.isPlaying = false
}

function onAudioEnded() {
  // 播放结束，自动播放下一首
  songsStore.playNextSong()
}

function onAudioError(event: Event) {
  console.error('Audio error:', event)
  songsStore.isPlaying = false
}

// ⭐ 用户交互处理器
function onProgressChange(value: number | undefined) {
  if (value === undefined) return
  isSeeking.value = true
  songsStore.setProgress(value)
  // 延迟重置 seeking 状态，避免跳动
  setTimeout(() => {
    isSeeking.value = false
  }, 100)
}

function onVolumeChange(val: number | undefined) {
  if (val === undefined) return
  const v = Math.max(0, Math.min(100, Number(val))) / 100
  songsStore.setVolume(v)
}

function prevSong() {
  songsStore.playPrevSong()
}

function nextSong() {
  songsStore.playNextSong()
}

function togglePlay() {
  songsStore.togglePlay()
}

function showLyrics() {
  if (showLyricPage.value) {
    router.push('/')
  } else {
    songsStore.showCurrentLyrics()
    router.push('/lyric')
  }
}

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
