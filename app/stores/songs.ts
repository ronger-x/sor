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

  function startLyricSync(audioRef?: HTMLAudioElement | null) {
    if (!audioRef) return
    stopLyricSync()
    lyricTimer = window.setInterval(() => {
      const timeMs = (audioRef.currentTime || 0) * 1000
      const idx = parsedLyrics.value.findIndex(l => l.time > timeMs)
      currentLyricLine.value = idx === -1 ? parsedLyrics.value.length - 1 : Math.max(0, idx - 1)

      // 同步更新 currentTime
      currentTime.value = audioRef.currentTime || 0
    }, 100) // 提高更新频率到 100ms，让进度条更流畅
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
      const params: Record<string, any> = { q, random, limit: 50 }
      // remove undefined params
      Object.keys(params).forEach(k => params[k] === undefined && delete params[k])
      const res = await $fetch('/api/songs', { params })
      // 不重置 currentSong，保持当前播放
      songs.value = res as Song[]
    } catch (e) {
      songs.value = []
      console.error('Failed to fetch songs:', e)
    } finally {
      loading.value = false
    }
  }

  async function playSong(idx: number, audioRef?: HTMLAudioElement | null) {
    // 处理索引越界
    if (idx < 0 || idx >= songs.value.length) {
      console.warn('Invalid song index:', idx)
      return
    }

    currentIndex.value = idx
    currentSong.value = songs.value[idx] || null

    // 重置播放进度
    currentTime.value = 0
    duration.value = 0

    await nextTick()
    const audio = audioRef
    if (!audio) return

    try {
      // apply persisted volume/mute to the audio element
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
      // 获取歌曲时长
      duration.value = audio.duration || 0
      // 歌词高亮同步定时器启动
      startLyricSync(audio)
    } catch (err) {
      isPlaying.value = false
      console.warn('audio play failed', err)
    }

    // 切歌时自动更新歌词和高亮行
    await showCurrentLyrics()
  }

  // 播放上一首
  async function playPrevSong(audioRef?: HTMLAudioElement | null) {
    const idx = currentSongIndex.value

    if (idx === -1) {
      // 当前歌曲不在列表中，播放第一首
      if (songs.value.length > 0) {
        await playSong(0, audioRef)
      }
    } else if (idx > 0) {
      // 播放上一首
      await playSong(idx - 1, audioRef)
    }
  }

  // 播放下一首
  async function playNextSong(audioRef?: HTMLAudioElement | null) {
    const idx = currentSongIndex.value

    if (idx === -1) {
      // 当前歌曲不在列表中，播放第一首
      if (songs.value.length > 0) {
        await playSong(0, audioRef)
      }
    } else if (idx < songs.value.length - 1) {
      // 播放下一首
      await playSong(idx + 1, audioRef)
    }
  }

  async function togglePlay(audioRef?: HTMLAudioElement | null) {
    if (!audioRef) return

    // 如果没有当前歌曲，尝试播放第一首
    if (!currentSong.value && songs.value.length > 0) {
      await playSong(0, audioRef)
      return
    }

    try {
      audioRef.volume = volume.value
      audioRef.muted = muted.value
    } catch (e) {
      console.warn('Failed to set audio properties:', e)
    }

    if (isPlaying.value) {
      audioRef.pause()
      isPlaying.value = false
      stopLyricSync()
    } else {
      try {
        await audioRef.play()
        isPlaying.value = true
        // 获取歌曲时长（如果还没有）
        if (!duration.value && audioRef.duration) {
          duration.value = audioRef.duration
        }
        startLyricSync(audioRef)
      } catch (err) {
        console.warn('audio play failed', err)
        isPlaying.value = false
      }
    }
  }

  function setVolume(v: number, audioRef?: HTMLAudioElement | null) {
    const nv = Math.max(0, Math.min(1, v))
    volume.value = nv
    // if volume zero, consider muted
    if (nv === 0) {
      muted.value = true
    } else {
      muted.value = false
    }

    if (audioRef) {
      try {
        audioRef.volume = nv
        audioRef.muted = muted.value
      } catch (e) {
        console.warn('Failed to set volume:', e)
      }
    }
  }

  function toggleMute(audioRef?: HTMLAudioElement | null) {
    muted.value = !muted.value
    if (audioRef) {
      try {
        audioRef.muted = muted.value
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
  function setProgress(timeSeconds: number, audioRef?: HTMLAudioElement | null) {
    if (!audioRef) return

    try {
      audioRef.currentTime = timeSeconds
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
      const params: Record<string, any> = { url: currentSong.value.lrc }
      Object.keys(params).forEach(k => params[k] === undefined && delete params[k])
      // request LRC via server proxy to keep API key on server
      const lrc = await $fetch('/api/lyrics', { params })
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
        result.push({ time, text })
      }
    }

    return result.sort((a, b) => a.time - b.time)
  }

  function seekTo(timeMs: number, audioRef?: HTMLAudioElement | null) {
    if (!audioRef) return

    try {
      audioRef.currentTime = timeMs / 1000
      currentTime.value = timeMs / 1000
      audioRef.play().catch((e) => {
        console.warn('Failed to play after seek:', e)
      })
      isPlaying.value = true

      // 歌词高亮行同步
      const idx = parsedLyrics.value.findIndex((l: { time: number }) => l.time >= timeMs)
      currentLyricLine.value = idx === -1 ? parsedLyrics.value.length - 1 : idx
    } catch (e) {
      console.warn('seek failed', e)
    }
  }

  // 重置播放器状态
  function reset() {
    stopLyricSync()
    currentSong.value = null
    currentIndex.value = -1
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    lyrics.value = ''
    parsedLyrics.value = []
    currentLyricLine.value = 0
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

    // volume controls
    volume,
    muted,
    setVolume,
    toggleMute
  }
})
