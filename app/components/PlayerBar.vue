<template>
  <div :class="['card-surface', 'border-theme', ...containerClasses]">
    <div class="w-full space-y-2">
      <!-- 歌曲信息和控制按钮 -->
      <div class="relative flex items-center w-full">
        <NuxtImg
          :src="currentSong?.cover"
          class="w-10 h-10 md:w-12 md:h-12 rounded mr-4"
          :alt="currentSong?.name"
          :placeholder="[50, 25, 75, 5]"
        />
        <div class="flex-1 min-w-0">
          <div class="font-bold truncate">{{ currentSong?.name }}</div>
          <div class="text-sm truncate">{{ currentSong?.artist }}</div>
        </div>
        <div v-if="$device.isDesktop" :class="centerControlClasses" style="z-index: 20">
          <!-- Play Mode Button -->
          <UButton :icon="playModeIcon" variant="ghost" @click.stop="cyclePlayMode" />

          <!-- Volume button -->
          <UPopover v-model:open="showVolume" placement="top-end">
            <UButton :icon="volumeIcon" variant="ghost" @click.stop />
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
          /><!-- Playlist Button -->
          <UPopover ref="playlistPopover" @update:open="onPlaylistOpen">
            <UButton icon="i-lucide-list-music" variant="ghost" @click.stop />
            <template #content>
              <div class="p-3 w-64 space-y-2">
                <div class="flex items-center justify-between">
                  <div class="text-xs font-semibold uppercase opacity-70">
                    {{ currentPlaylist?.name || '播放列表' }} ({{ playlistSongs.length }})
                  </div>
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="error"
                    icon="i-lucide-trash-2"
                    @click.stop="clearAll"
                    :disabled="!playlistSongs.length"
                  />
                </div>
                <div ref="playlistContainer" class="max-h-64 overflow-auto space-y-1 pr-1">
                  <div
                    v-for="(s, i) in playlistSongs"
                    :key="s.url"
                    class="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/10 rounded px-2 py-1.5 group transition-colors"
                    :class="{ 'bg-primary/15 ring-1 ring-primary/30': currentSong?.url === s.url }"
                    @click.stop="playFromList(i)"
                  >
                    <NuxtImg :src="s.cover" class="w-8 h-8 rounded object-cover shrink-0" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium truncate">{{ s.name }}</div>
                      <div class="text-xs opacity-60 truncate">{{ s.artist }}</div>
                    </div>
                    <UButton
                      v-if="currentSong?.url !== s.url"
                      icon="i-lucide-x"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      class="opacity-0 group-hover:opacity-100 transition-opacity"
                      @click.stop="removeAt(i)"
                    />
                  </div>
                </div>
              </div>
            </template>
          </UPopover>

          <UButton icon="i-lucide-music-4" variant="ghost" @click.stop="showLyrics" />
        </div>
        <!-- Mobile compact controls: show on non-desktop devices -->
        <div v-else class="flex items-center gap-2 ml-2 z-20">
          <!-- Play Mode Button -->
          <UButton :icon="playModeIcon" variant="ghost" size="sm" @click.stop="cyclePlayMode" />

          <!-- Mobile: volume button before lyrics -->
          <UPopover v-model:open="showVolume" placement="top-end">
            <UButton :icon="volumeIcon" variant="ghost" size="sm" @click.stop />
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
          <!-- Mobile Playlist Button -->
          <UPopover ref="mobilePlaylistPopover" @update:open="onPlaylistOpen">
            <UButton icon="i-lucide-list-music" variant="ghost" size="sm" @click.stop />
            <template #content>
              <div class="p-2 w-56 space-y-2">
                <div class="flex items-center justify-between">
                  <div class="text-xs font-semibold uppercase opacity-70">
                    {{ currentPlaylist?.name || '列表' }} ({{ playlistSongs.length }})
                  </div>
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="error"
                    icon="i-lucide-trash-2"
                    @click.stop="clearAll"
                    :disabled="!playlistSongs.length"
                  />
                </div>
                <div ref="mobilePlaylistContainer" class="max-h-48 overflow-auto space-y-1 pr-1">
                  <div
                    v-for="(s, i) in playlistSongs"
                    :key="s.url"
                    class="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/10 rounded px-2 py-1 group transition-colors"
                    :class="{ 'bg-primary/15 ring-1 ring-primary/30': currentSong?.url === s.url }"
                    @click.stop="playFromList(i)"
                  >
                    <NuxtImg :src="s.cover" class="w-6 h-6 rounded object-cover shrink-0" />
                    <span class="truncate flex-1">{{ s.name }}</span>
                    <UButton
                      v-if="currentSong?.url !== s.url"
                      icon="i-lucide-x"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      class="opacity-0 group-hover:opacity-100 transition-opacity"
                      @click.stop="removeAt(i)"
                    />
                  </div>
                </div>
              </div>
            </template>
          </UPopover>

          <UButton icon="i-lucide-music-4" variant="ghost" size="sm" @click.stop="showLyrics" />
        </div>
      </div>

      <!-- 播放进度条 -->
      <div
        class="flex items-center gap-3"
        :class="progressContainerClasses"
        :style="{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }"
      >
        <span class="text-xs tabular-nums min-w-10 text-right">
          {{ formatTime(currentTime) }}
        </span>
        <div class="relative flex-1 h-4 flex items-center">
          <div class="absolute inset-x-0 h-1.5 rounded-full bg-accented/30 overflow-hidden">
            <div
              class="h-full bg-accented/60 transition-all duration-300"
              :style="{ width: `${(bufferedPercent * 100).toFixed(2)}%` }"
            ></div>
          </div>
          <USlider
            :model-value="currentTime"
            :max="duration || 100"
            :step="0.1"
            class="flex-1 relative"
            @pointerdown="onSeekStart"
            @pointerup="onSeekEnd"
            @update:model-value="onProgressChange"
          />
        </div>
        <span class="text-xs tabular-nums min-w-10">
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

// Playlist refs
const playlistPopover = ref()
const mobilePlaylistPopover = ref()
const playlistContainer = ref<HTMLDivElement | null>(null)
const mobilePlaylistContainer = ref<HTMLDivElement | null>(null)

const showLyricPage = computed(() => router.currentRoute.value.path === '/lyric')

// 使用 store 中的状态
const currentSong = computed(() => songsStore.currentSong)
const currentTime = computed(() => songsStore.currentTime)
const duration = computed(() => songsStore.duration)
const hasPrev = computed(() => songsStore.hasPrev)
const hasNext = computed(() => songsStore.hasNext)
const volume = computed(() => songsStore.volume)
const muted = computed(() => songsStore.muted)
const bufferedPercent = computed(() => songsStore.bufferedPercent)
const playMode = computed(() => songsStore.playMode)
const currentPlaylist = computed(() => songsStore.currentPlaylist)

// 当前播放列表的歌曲数组
const playlistSongs = computed(() => currentPlaylist.value?.items || [])

const playPauseIcon = computed(() => (songsStore.isPlaying ? 'i-lucide-pause' : 'i-lucide-play'))

const volumeIcon = computed(() => {
  if (muted.value || (volume.value ?? 1) === 0) return 'i-lucide-volume-off'
  if ((volume.value ?? 1) < 0.5) return 'i-lucide-volume-1'
  return 'i-lucide-volume-2'
})

const playModeIcon = computed(() => {
  switch (playMode.value) {
    case 'repeat-one':
      return 'i-lucide-repeat-1'
    case 'shuffle':
      return 'i-lucide-shuffle'
    default:
      return 'i-lucide-repeat'
  }
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

function onSeekStart() {
  isSeeking.value = true
  songsStore.beginSeek()
}

function onSeekEnd() {
  isSeeking.value = false
  songsStore.endSeek()
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

// 播放列表相关函数
function playFromList(index: number) {
  songsStore.playSong(index)
}

function removeAt(index: number) {
  songsStore.removeSong(index)
}

function clearAll() {
  if (confirm('确定要清空播放列表吗？')) {
    songsStore.clearSongs()
  }
}

function cyclePlayMode() {
  const modes: Array<'sequential' | 'repeat-one' | 'shuffle'> = [
    'sequential',
    'repeat-one',
    'shuffle'
  ]
  const currentIndex = modes.indexOf(playMode.value)
  const nextIndex = (currentIndex + 1) % modes.length
  const nextMode = modes[nextIndex]
  if (nextMode) {
    songsStore.setPlayMode(nextMode)
  }
}

function onPlaylistOpen() {
  // 滚动当前播放项到视图中心
  requestAnimationFrame(() => {
    const containers = [playlistContainer.value, mobilePlaylistContainer.value].filter(Boolean)
    containers.forEach(container => {
      if (!container) return
      // 使用属性选择器来查找当前播放的歌曲
      const activeItem = container.querySelector('[class*="ring-1"]') as HTMLElement
      if (activeItem) {
        const containerHeight = container.clientHeight
        const itemTop = activeItem.offsetTop
        const itemHeight = activeItem.clientHeight
        const scrollTop = itemTop - containerHeight / 2 + itemHeight / 2
        container.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' })
      }
    })
  })
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
  'lg:max-w-[450px]', // 大屏幕稍微放宽
  // 移动端：使用全宽但留出边距
  'max-w-full'
])
</script>
