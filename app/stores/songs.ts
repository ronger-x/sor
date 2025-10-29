import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'
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

  // 播放进度相关状态
  const currentTime = ref(0)
  const duration = ref(0)

  // volume control
  const volume = ref(0.5) // range 0.0 - 1.0
  const muted = ref(false)

  // ⭐ 全局唯一的 audioRef
  const audioRef = ref<HTMLAudioElement | null>(null)

  // 歌词高亮同步定时器
  let lyricTimer: number | null = null

  // 直接存储当前播放歌曲，避免 songs 变化影响播放
  const currentSong = ref<Song | null>(null)

  // Computed: 判断当前歌曲是否在播放列表中
  const isCurrentSongInList = computed(() => {
    if (!currentSong.value) return false
    return songs.value.some(s => s.url === currentSong.value?.url)
  })

  // Computed: 获取当前歌曲在列表中的索引
  const currentSongIndex = computed(() => {
    if (!currentSong.value) return -1
    return songs.value.findIndex(s => s.url === currentSong.value?.url)
  })

  // Computed: 是否有上一首
  const hasPrev = computed(() => {
    const idx = currentSongIndex.value
    if (idx === -1) return songs.value.length > 0
    return idx > 0
  })

  // Computed: 是否有下一首
  const hasNext = computed(() => {
    const idx = currentSongIndex.value
    if (idx === -1) return songs.value.length > 0
    return idx < songs.value.length - 1
  })

  // ⭐ 初始化 audio 元素（在组件中调用）
  function initAudio(audio: HTMLAudioElement) {
    audioRef.value = audio

    // 设置初始音量和静音状态
    try {
      audio.volume = volume.value
      audio.muted = muted.value
    } catch (e) {
      console.warn('Failed to set initial audio properties:', e)
    }
  }

  // ⭐ 获取 audio 元素的辅助函数
  function getAudio(): HTMLAudioElement | null {
    return audioRef.value
  }

  function startLyricSync() {
    const audio = getAudio()
    if (!audio) return
    stopLyricSync()
    lyricTimer = window.setInterval(() => {
      const timeMs = (audio.currentTime || 0) * 1000
      const idx = parsedLyrics.value.findIndex(l => l.time > timeMs)
      currentLyricLine.value = idx === -1 ? parsedLyrics.value.length - 1 : Math.max(0, idx - 1)

      // 同步更新 currentTime
      currentTime.value = audio.currentTime || 0
    }, 100)
  }

  function stopLyricSync() {
    if (lyricTimer) {
      clearInterval(lyricTimer)
      lyricTimer = null
    }
  }

  async function fetchDefaultSongs() {
    await searchSongs('', true)
  }

  async function searchSongs(q: string, random?: boolean) {
    loading.value = true
    try {
      const params: Record<string, any> = {q, random, limit: 50}
      Object.keys(params).forEach(k => params[k] === undefined && delete params[k])
      const res = await $fetch('/api/songs', {params})
      songs.value = res as Song[]
    } catch (e) {
      songs.value = []
      console.error('Failed to fetch songs:', e)
    } finally {
      loading.value = false
    }
  }

  async function playSong(idx: number) {
    // 处理索引越界
    if (idx < 0 || idx >= songs.value.length) {
      console.warn('Invalid song index:', idx)
      return
    }

    const audio = getAudio()
    if (!audio) {
      console.warn('Audio element not initialized')
      return
    }

    currentIndex.value = idx
    currentSong.value = songs.value[idx] || null

    // 重置播放进度
    currentTime.value = 0
    duration.value = 0

    await nextTick()

    try {
      audio.volume = volume.value
      audio.muted = muted.value
    } catch (e) {
      console.warn('Failed to set audio properties:', e)
    }

    try {
      audio.pause()
    } catch (e) {
      console.warn('Failed to pause audio:', e)
    }

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
      } catch (e) {
        console.warn('Failed to load audio:', e)
      }
    })

    try {
      isPlaying.value = true
      await audio.play()
      duration.value = audio.duration || 0
      startLyricSync()
    } catch (err) {
      isPlaying.value = false
      console.warn('audio play failed', err)
    }

    await showCurrentLyrics()
  }

  // 播放上一首
  async function playPrevSong() {
    const idx = currentSongIndex.value

    if (idx === -1) {
      if (songs.value.length > 0) {
        await playSong(0)
      }
    } else if (idx > 0) {
      await playSong(idx - 1)
    }
  }

  // 播放下一首
  async function playNextSong() {
    const idx = currentSongIndex.value

    if (idx === -1) {
      if (songs.value.length > 0) {
        await playSong(0)
      }
    } else if (idx < songs.value.length - 1) {
      await playSong(idx + 1)
    }
  }

  async function togglePlay() {
    const audio = getAudio()
    if (!audio) {
      console.warn('Audio element not initialized')
      return
    }

    // 如果没有当前歌曲，尝试播放第一首
    if (!currentSong.value && songs.value.length > 0) {
      await playSong(0)
      return
    }

    try {
      audio.volume = volume.value
      audio.muted = muted.value
    } catch (e) {
      console.warn('Failed to set audio properties:', e)
    }

    if (isPlaying.value) {
      audio.pause()
      isPlaying.value = false
      stopLyricSync()
    } else {
      try {
        await audio.play()
        isPlaying.value = true
        if (!duration.value && audio.duration) {
          duration.value = audio.duration
        }
        startLyricSync()
      } catch (err) {
        console.warn('audio play failed', err)
        isPlaying.value = false
      }
    }
  }

  function setVolume(v: number) {
    const audio = getAudio()
    const nv = Math.max(0, Math.min(1, v))
    volume.value = nv

    if (nv === 0) {
      muted.value = true
    } else {
      muted.value = false
    }

    if (audio) {
      try {
        audio.volume = nv
        audio.muted = muted.value
      } catch (e) {
        console.warn('Failed to set volume:', e)
      }
    }
  }

  function toggleMute() {
    const audio = getAudio()
    muted.value = !muted.value
    if (audio) {
      try {
        audio.muted = muted.value
      } catch (e) {
        console.warn('Failed to toggle mute:', e)
      }
    }
  }

  // 更新播放进度
  function updateProgress(time: number, dur: number) {
    currentTime.value = time
    if (dur && isFinite(dur)) {
      duration.value = dur
    }
  }

  // 设置播放进度
  function setProgress(timeSeconds: number) {
    const audio = getAudio()
    if (!audio) return

    try {
      audio.currentTime = timeSeconds
      currentTime.value = timeSeconds

      // 更新歌词高亮
      const timeMs = timeSeconds * 1000
      const idx = parsedLyrics.value.findIndex(l => l.time > timeMs)
      currentLyricLine.value = idx === -1 ? parsedLyrics.value.length - 1 : Math.max(0, idx - 1)
    } catch (e) {
      console.warn('Failed to set progress:', e)
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
      const params: Record<string, any> = {url: currentSong.value.lrc}
      Object.keys(params).forEach(k => params[k] === undefined && delete params[k])
      const lrc = await $fetch('/api/lyrics', {params})
      lyrics.value = lrc as string
      parsedLyrics.value = parseLRC(lyrics.value)
    } catch (e) {
      lyrics.value = '歌词加载失败'
      console.error('Failed to load lyrics:', e)
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
        result.push({time, text})
      }
    }

    return result.sort((a, b) => a.time - b.time)
  }

  function seekTo(timeMs: number) {
    const audio = getAudio()
    if (!audio) return

    try {
      audio.currentTime = timeMs / 1000
      currentTime.value = timeMs / 1000
      audio.play().catch((e) => {
        console.warn('Failed to play after seek:', e)
      })
      isPlaying.value = true

      const idx = parsedLyrics.value.findIndex((l: { time: number }) => l.time >= timeMs)
      currentLyricLine.value = idx === -1 ? parsedLyrics.value.length - 1 : idx
    } catch (e) {
      console.warn('seek failed', e)
    }
  }

  // 重置播放器状态
  function reset() {
    stopLyricSync()
    const audio = getAudio()
    if (audio) {
      try {
        audio.pause()
        audio.src = ''
      } catch (e) {
        console.warn('Failed to reset audio:', e)
      }
    }
    currentSong.value = null
    currentIndex.value = -1
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    lyrics.value = ''
    parsedLyrics.value = []
    currentLyricLine.value = 0
  }

  // ⭐ 清理资源（在应用卸载时调用）
  function dispose() {
    reset()
    audioRef.value = null
  }

  return {
    songs,
    loading,
    currentIndex,
    isPlaying,
    currentSong,
    currentTime,
    duration,
    lyrics,
    lyricsLoading,
    parsedLyrics,
    lyricsModal,
    currentLyricLine,

    // Computed
    isCurrentSongInList,
    currentSongIndex,
    hasPrev,
    hasNext,

    // Audio management
    audioRef,
    initAudio,
    getAudio,

    // Methods
    fetchDefaultSongs,
    searchSongs,
    playSong,
    playPrevSong,
    playNextSong,
    togglePlay,
    showCurrentLyrics,
    seekTo,
    startLyricSync,
    stopLyricSync,
    updateProgress,
    setProgress,
    reset,
    dispose,

    // volume controls
    volume,
    muted,
    setVolume,
    toggleMute
  }
})
