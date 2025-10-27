<template>
  <div
    class="fixed bottom-0 left-0 right-0 w-full bg-white border-t z-50 shadow px-4 py-2 min-h-14"
  >
    <div class="relative flex items-center w-full" style="min-height: 56px">
      <img :src="currentSong?.cover" class="w-12 h-12 rounded mr-4" :alt="currentSong?.name"/>
      <div class="flex-1 min-w-0">
        <div class="font-bold truncate">{{ currentSong?.name }}</div>
        <div class="text-gray-500 text-sm truncate">{{ currentSong?.artist }}</div>
      </div>
      <div
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-white px-2 rounded shadow"
        style="z-index: 20"
      >
        <UButton
          icon="i-heroicons-backward"
          variant="ghost"
          @click.stop="prevSong"
          :disabled="!hasPrev"
        />
        <UButton :icon="playPauseIcon" variant="solid" color="primary" @click.stop="togglePlay" />
        <UButton
          icon="i-heroicons-forward"
          variant="ghost"
          @click.stop="nextSong"
          :disabled="!hasNext"
        />
        <UButton icon="i-heroicons-musical-note" variant="ghost" @click.stop="showLyrics" />
      </div>
      <audio
        ref="audioRef"
        :src="currentSong?.url"
        @ended="nextSong"
        @play="onAudioPlay"
        @pause="onAudioPause"
        style="display: none"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSongsStore } from '@/stores/songs'

const songsStore = useSongsStore()
const audioRef = ref<HTMLAudioElement | null>(null)

const currentSong = computed(() => songsStore.currentSong)
const currentIndex = computed(() =>
  songsStore.songs.findIndex(s => s.url === currentSong.value?.url)
)
const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(
  () => currentIndex.value < songsStore.songs.length - 1 && currentIndex.value !== -1
)
const playPauseIcon = computed(() =>
  songsStore.isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'
)

function playSong(idx: number) {
  songsStore.playSong(idx, audioRef.value)
}
function prevSong() {
  if (hasPrev.value) playSong(currentIndex.value - 1)
}
function nextSong() {
  if (hasNext.value) playSong(currentIndex.value + 1)
}
function togglePlay() {
  songsStore.togglePlay(audioRef.value)
}
function showLyrics() {
  songsStore.showCurrentLyrics()
}
function onAudioPlay() {
  songsStore.isPlaying = true
}
function onAudioPause() {
  songsStore.isPlaying = false
}

// 监听 currentSong 变化，自动播放
watch(currentSong, (song, prev) => {
  if (song && song !== prev && audioRef.value) {
    songsStore.playSong(currentIndex.value, audioRef.value)
  }
})
</script>
