import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'
import { useRuntimeConfig } from '#imports'
import type { Song } from '@/types'

export const useSongsStore = defineStore('songs', () => {
  const songs = ref<Song[]>([])
  const loading = ref(false)
  const currentIndex = ref(-1)
  const isPlaying = ref(false)
  const lyrics = ref('')
  const lyricsLoading = ref(false)
  const parsedLyrics = ref<{ time: number; text: string }[]>([])
  const lyricsModal = ref(false)
  const currentLyricLine = ref(0)
  // volume control
  const volume = ref(1) // range 0.0 - 1.0
  const muted = ref(false)
  // 歌词高亮同步定时器
  let lyricTimer: number | null = null
  function startLyricSync(audioRef?: HTMLAudioElement | null) {
    if (!audioRef) return
    stopLyricSync()
    lyricTimer = window.setInterval(() => {
      const timeMs = (audioRef.currentTime || 0) * 1000
      const idx = parsedLyrics.value.findIndex(l => l.time > timeMs)
      currentLyricLine.value = idx === -1 ? parsedLyrics.value.length - 1 : Math.max(0, idx - 1)
    }, 200)
  }

  function stopLyricSync() {
    if (lyricTimer) {
      clearInterval(lyricTimer)
      lyricTimer = null
    }
  }

  const config = useRuntimeConfig()
  const apiKey = config.public.musicApiKey

  // 直接存储当前播放歌曲，避免 songs 变化影响播放
  const currentSong = ref<Song | null>(null)

  async function fetchDefaultSongs() {
    await searchSongs('', true)
  }

  async function searchSongs(q: string, random?: boolean) {
    loading.value = true
    try {
      let res = await $fetch('https://music.czx.me:6/songs', {
        params: { q, random, limit: 50 },
        headers: { 'X-API-KEY': apiKey }
      })
      // 不重置 currentSong，保持当前播放
      songs.value = res as Song[]
    } catch (e) {
      songs.value = []
    } finally {
      loading.value = false
    }
  }

  async function playSong(idx: number, audioRef?: HTMLAudioElement | null) {
    currentIndex.value = idx
    currentSong.value = songs.value[idx] || null
    await nextTick()
    const audio = audioRef
    if (!audio) return
    try {
      // apply persisted volume/mute to the audio element
      audio.volume = volume.value
      audio.muted = muted.value
    } catch {}
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
      // 歌词高亮同步定时器启动
      startLyricSync(audio)
    } catch (err) {
      isPlaying.value = false
      // eslint-disable-next-line no-console
      console.warn('audio play failed', err)
    }
    // 切歌时自动更新歌词和高亮行
    await showCurrentLyrics()
  }

  async function togglePlay(audioRef?: HTMLAudioElement | null) {
    if (!audioRef) return
    try {
      audioRef.volume = volume.value
      audioRef.muted = muted.value
    } catch {}
    if (isPlaying.value) {
      audioRef.pause()
      isPlaying.value = false
      stopLyricSync()
    } else {
      try {
        await audioRef.play()
        isPlaying.value = true
        startLyricSync(audioRef)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('audio play failed', err)
        isPlaying.value = false
      }
    }
  }

  function setVolume(v: number, audioRef?: HTMLAudioElement | null) {
    const nv = Math.max(0, Math.min(1, v))
    volume.value = nv
    // if volume zero, consider muted
    if (nv === 0) muted.value = true
    else muted.value = false
    if (audioRef) {
      try {
        audioRef.volume = nv
        audioRef.muted = muted.value
      } catch {}
    }
  }

  function toggleMute(audioRef?: HTMLAudioElement | null) {
    muted.value = !muted.value
    if (audioRef) {
      try {
        audioRef.muted = muted.value
      } catch {}
    }
  }

  async function showCurrentLyrics() {
    if (!currentSong.value) return
    lyricsModal.value = true
    lyrics.value = ''
    lyricsLoading.value = true
    parsedLyrics.value = []
    currentLyricLine.value = 0
    try {
      const lrc = await $fetch(currentSong.value.lrc, {
        headers: { 'X-API-KEY': apiKey }
      })
      lyrics.value = lrc as string
      parsedLyrics.value = parseLRC(lyrics.value)
    } catch (e) {
      lyrics.value = '歌词加载失败'
    } finally {
      lyricsLoading.value = false
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

  function seekTo(timeMs: number, audioRef?: HTMLAudioElement | null) {
    if (!audioRef) return
    try {
      audioRef.currentTime = timeMs / 1000
      audioRef.play().catch(() => {})
      isPlaying.value = true
      // 歌词高亮行同步
      const idx = parsedLyrics.value.findIndex((l: { time: number }) => l.time >= timeMs)
      currentLyricLine.value = idx === -1 ? parsedLyrics.value.length - 1 : idx
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('seek failed', e)
    }
  }

  return {
    songs,
    loading,
    currentIndex,
    isPlaying,
    currentSong,
    lyrics,
    lyricsLoading,
    parsedLyrics,
    lyricsModal,
    currentLyricLine,
    fetchDefaultSongs,
    searchSongs,
    playSong,
    togglePlay,
    showCurrentLyrics,
    seekTo,
    startLyricSync,
    stopLyricSync,
    // volume controls
    volume,
    muted,
    setVolume,
    toggleMute
  }
})
