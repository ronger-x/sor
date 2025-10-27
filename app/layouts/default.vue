<template>
  <UContainer class="min-h-screen flex flex-col bg-gray-50">
    <UHeader class="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
      <template #left>
        <span class="text-xl font-bold tracking-wide">S.O.R Music</span>
      </template>
      <template #right>
        <slot name="search">
          <UDashboardSearch placeholder="搜索歌曲/歌手..." />
        </slot>
      </template>
    </UHeader>

    <UMain
      class="flex-1 flex flex-col items-center justify-start w-full max-w-5xl mx-auto px-2 py-6"
    >
      <slot />
    </UMain>

    <UFooter class="w-full bg-white border-t shadow z-30 px-0 py-0 sticky bottom-0">
      <slot name="player" />
    </UFooter>
  </UContainer>
</template>
<script setup lang="ts">
import {computed, nextTick, onMounted, ref, watch} from 'vue'
import type {Song} from '@/types'

const config = useRuntimeConfig()

const query = ref('')
const songs = ref<Song[]>([])
const loading = ref(false)

const lyricsModal = ref(false)
const lyrics = ref('')
const lyricsLoading = ref(false)
const parsedLyrics = ref<{ time: number; text: string }[]>([])
const currentLyricLine = ref(0)

const currentIndex = ref(-1)
const currentSong = computed<Song | null>(() => songs.value[currentIndex.value] || null)
const audioRef = ref<HTMLAudioElement | null>(null)

const isPlaying = ref(false)
const playPauseIcon = computed(() => (isPlaying.value ? 'i-heroicons-pause' : 'i-heroicons-play'))
const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(
  () => currentIndex.value < songs.value.length - 1 && currentIndex.value !== -1
)

onMounted(() => {
  fetchDefaultSongs()
})

async function fetchDefaultSongs() {
  loading.value = true
  try {
    const res = await $fetch('https://music.czx.me:6/songs', {
      params: { random: true, limit: 50 },
      headers: { 'X-API-KEY': config.public.musicApiKey }
    })
    songs.value = res as any[]
    songs.value = res as Song[]
  } catch (e) {
    songs.value = []
  } finally {
    loading.value = false
  }
}

async function searchSongs(q: string) {
  if (!q) {
    fetchDefaultSongs()
    return
  }
  loading.value = true
  try {
    const res = await $fetch('https://music.czx.me:6/songs', {
      params: { q, limit: 50 },
      headers: { 'X-API-KEY': config.public.musicApiKey }
    })
    songs.value = res as any[]
    songs.value = res as Song[]
  } catch (e) {
    songs.value = []
  } finally {
    loading.value = false
  }
}

async function playSong(idx: number) {
  currentIndex.value = idx
  await nextTick()
  const audio = audioRef.value
  if (!audio) return
  try {
    audio.pause()
  } catch {}
  if (currentSong.value && audio.src !== currentSong.value.url) {
    audio.src = currentSong.value.url
  }
  await new Promise<void>(resolve => {
    if (audio.readyState >= 3) return resolve()
    const onCanPlay = () => {
      audio.removeEventListener('canplay', onCanPlay)
      resolve()
    }
    audio.addEventListener('canplay', onCanPlay)
    try {
      audio.load()
    } catch {}
  })
  try {
    isPlaying.value = true
    await audio.play()
  } catch (err) {
    isPlaying.value = false
    console.warn('audio play failed', err)
  }
}

async function togglePlay() {
  if (!audioRef.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
    isPlaying.value = false
  } else {
    try {
      await audioRef.value.play()
      isPlaying.value = true
    } catch (err) {
      console.warn('audio play failed', err)
      isPlaying.value = false
    }
  }
}
function prevSong() {
  if (hasPrev.value) playSong(currentIndex.value - 1)
}
function nextSong() {
  if (hasNext.value) playSong(currentIndex.value + 1)
}
function onAudioPlay() {
  isPlaying.value = true
}
function onAudioPause() {
  isPlaying.value = false
}

async function showCurrentLyrics() {
  if (!currentSong.value) return
  lyricsModal.value = true
  lyrics.value = ''
  lyricsLoading.value = true
  parsedLyrics.value = []
  currentLyricLine.value = 0
  try {
    const lrc = await $fetch(currentSong.value.lrc)
    lyrics.value = lrc as string
    parsedLyrics.value = parseLRC(lyrics.value)
  } catch (e) {
    lyrics.value = '歌词加载失败'
  } finally {
    lyricsLoading.value = false
  }
}
function seekTo(timeMs: number) {
  if (!audioRef.value) return
  try {
    audioRef.value.currentTime = timeMs / 1000
    audioRef.value.play().catch(() => {})
    isPlaying.value = true
  } catch (e) {
    console.warn('seek failed', e)
  }
}
function parseLRC(lrc: string) {
  const lines = lrc.split(/\r?\n/)
  const result: { time: number; text: string }[] = []
  const timeReg = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g
  for (const line of lines) {
    let match
    let text = line.replace(timeReg, '').trim()
    timeReg.lastIndex = 0
    while ((match = timeReg.exec(line))) {
      const min = parseInt(match[1] ?? '0')
      const sec = parseInt(match[2] ?? '0')
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0
      const time = min * 60 * 1000 + sec * 1000 + ms
      result.push({ time, text })
    }
  }
  return result.sort((a, b) => a.time - b.time)
}
watch(lyricsModal, open => {
  if (!open) currentLyricLine.value = 0
})
watch(currentIndex, (newIdx, oldIdx) => {
  if (lyricsModal.value && newIdx !== oldIdx && currentSong.value) {
    showCurrentLyrics()
  }
})
</script>
