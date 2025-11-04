import { defineStore } from 'pinia'
import { ref, computed, nextTick, watch } from 'vue'
import type { Song } from '@/types'
import { useAudioPlayer } from '@/composables/useAudioPlayer'
import { usePlaylistManagement } from '@/composables/usePlaylistManagement'
import { useMediaSessionAPI } from '@/composables/useMediaSessionAPI'
import { useBufferManagement } from '@/composables/useBufferManagement'
import { useVolumeStore } from './volume'
import { useLyricsStore } from './lyrics'
import { useDataStore } from './data'

export const useSongsStore = defineStore('songs', () => {
  // ========== 引入子模块 ==========
  const volumeStore = useVolumeStore()
  const lyricsStore = useLyricsStore()
  const dataStore = useDataStore()

  // ========== 音频播放器 ==========
  const { audioRef, initAudio: baseInitAudio, getAudio } = useAudioPlayer()

  // ========== 播放状态 ==========
  const currentSong = ref<Song | null>(null)
  const currentIndex = ref(-1) // Deprecated
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)

  // ========== 播放列表管理 ==========
  const playlistManagement = usePlaylistManagement(currentSong)

  // ========== Media Session API ==========
  const mediaSession = useMediaSessionAPI()

  // ========== 缓冲管理 ==========
  const bufferManagement = useBufferManagement()

  // ========== 播放控制 ==========
  let playTokenCounter = 0

  /**
   * 播放指定索引的歌曲
   */
  async function playSong(idx: number) {
    const items = playlistManagement.playlistItems.value

    if (idx < 0 || idx >= items.length) {
      console.warn('Invalid song index:', idx)
      return
    }

    const audio = getAudio()
    if (!audio) {
      console.warn('Audio element not initialized')
      return
    }

    if (!playlistManagement.currentPlaylist.value) {
      console.warn('No playlist available')
      return
    }

    currentIndex.value = idx
    currentSong.value = items[idx] || null

    currentTime.value = 0
    duration.value = 0

    await nextTick()

    volumeStore.applyVolumeSettings(audio)

    try {
      audio.pause()
    } catch (e) {
      console.warn('Failed to pause audio:', e)
    }

    if (currentSong.value && audio.src !== currentSong.value.url) {
      audio.src = currentSong.value.url
    }

    const token = ++playTokenCounter

    const ensureCanPlay = async () => {
      if (audio.readyState >= 3) return true
      await new Promise<void>(resolve => {
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
      return true
    }

    await ensureCanPlay()
    if (token !== playTokenCounter) {
      return
    }

    try {
      const playResult = audio.play()
      isPlaying.value = true
      await playResult
      duration.value = isFinite(audio.duration) ? audio.duration : 0
      lyricsStore.startLyricSync(getAudio)
      mediaSession.updateMediaSession(currentSong.value)
      mediaSession.updateMediaSessionPlaybackState(isPlaying.value)
    } catch (err) {
      isPlaying.value = false
      console.warn('audio play failed', err)
    }

    await lyricsStore.showLyrics(currentSong.value?.lrc)
    preloadNextSong()
  }

  /**
   * 播放/暂停切换
   */
  async function togglePlay() {
    const audio = getAudio()
    if (!audio) {
      console.warn('Audio element not initialized')
      return
    }

    if (!currentSong.value && playlistManagement.playlistItems.value.length > 0) {
      await playSong(0)
      return
    }

    volumeStore.applyVolumeSettings(audio)

    if (isPlaying.value) {
      try {
        audio.pause()
      } catch (e) {
        console.warn('pause failed', e)
      }
      isPlaying.value = false
      lyricsStore.stopLyricSync()
      mediaSession.updateMediaSessionPlaybackState(false)
    } else {
      try {
        const playResult = audio.play()
        isPlaying.value = true
        await playResult
        if (!duration.value && isFinite(audio.duration)) {
          duration.value = audio.duration
        }
        lyricsStore.startLyricSync(getAudio)
        mediaSession.updateMediaSessionPlaybackState(true)
      } catch (err) {
        console.warn('audio play failed', err)
        isPlaying.value = false
      }
    }
  }

  /**
   * 播放下一首
   */
  async function playNextSong() {
    const nextIdx = playlistManagement.getNextSongIndex()
    if (nextIdx !== null) {
      await playSong(nextIdx)
    }
  }

  /**
   * 播放上一首
   */
  async function playPrevSong() {
    const prevIdx = playlistManagement.getPrevSongIndex()
    if (prevIdx !== null) {
      await playSong(prevIdx)
    }
  }

  /**
   * 更新播放进度
   */
  function updateProgress(time: number, dur: number) {
    currentTime.value = time
    if (dur && isFinite(dur)) {
      duration.value = dur
    }
  }

  /**
   * 设置播放进度
   */
  function setProgress(timeSeconds: number) {
    const audio = getAudio()
    if (!audio) return

    try {
      audio.currentTime = timeSeconds
      currentTime.value = timeSeconds

      const timeMs = timeSeconds * 1000
      const lyricLine = lyricsStore.findLyricLine(timeMs)
      lyricsStore.currentLyricLine = lyricLine
      mediaSession.updateMediaSessionPosition(getAudio, currentTime.value, duration.value)
    } catch (e) {
      console.warn('Failed to set progress:', e)
    }
  }

  /**
   * 预加载下一首歌曲
   */
  function preloadNextSong() {
    const idx = playlistManagement.currentSongIndex.value
    if (idx === -1) return
    const items = playlistManagement.playlistItems.value
    const next = items[idx + 1]
    if (!next) return

    lyricsStore.preloadLyrics(next.lrc)
  }

  /**
   * 重置播放器
   */
  function reset() {
    lyricsStore.stopLyricSync()
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
    lyricsStore.lyrics = ''
    lyricsStore.parsedLyrics = []
    lyricsStore.currentLyricLine = 0
    bufferManagement.bufferedPercent.value = 0
    bufferManagement.bufferedRanges.value = []
    mediaSession.updateMediaSessionPlaybackState(false, true)
    playlistManagement.resetShuffle()
  }

  /**
   * 清理资源
   */
  function dispose() {
    reset()
    audioRef.value = null
  }

  /**
   * 移除歌曲
   */
  function removeSong(index: number) {
    const result = playlistManagement.removeSong(index)
    if (!result) return

    if (result.isEmpty) {
      reset()
      return
    }

    if (result.newSong) {
      currentSong.value = result.newSong
      currentIndex.value = result.newIndex || 0
      mediaSession.updateMediaSession(currentSong.value)
    }
  }

  /**
   * 清空歌曲列表
   */
  function clearSongs() {
    playlistManagement.clearPlaylist()
    reset()
  }

  /**
   * 初始化音频元素
   */
  function initAudio(audio: HTMLAudioElement) {
    baseInitAudio(audio)
    volumeStore.applyVolumeSettings(audio)
    bufferManagement.attachBufferListeners(getAudio, duration.value)
    mediaSession.setupMediaSessionHandlers({
      onPlay: async () => {
        if (!isPlaying.value) await togglePlay()
      },
      onPause: async () => {
        if (isPlaying.value) await togglePlay()
      },
      onNext: () => playNextSong(),
      onPrev: () => playPrevSong(),
      onSeek: (time: number) => {
        lyricsStore.seekTo(time, getAudio)
        isPlaying.value = true
      }
    })
  }

  /**
   * 获取首页数据并初始化
   */
  async function fetchHomeData() {
    const { songs } = await dataStore.fetchHomeData()
    if (songs.length > 0 && !playlistManagement.currentPlaylistId.value) {
      playlistManagement.setPlaylist('default', '默认播放列表', songs)
    }
    await assignInitialRandomIfNeeded()
  }

  /**
   * 初次加载后随机挑一首但不播放
   */
  let initialRandomAssigned = false
  async function assignInitialRandomIfNeeded() {
    if (initialRandomAssigned) return
    const items = playlistManagement.playlistItems.value
    if (!items.length) return
    const idx = Math.floor(Math.random() * items.length)
    const picked = items[idx]
    if (!picked) return
    currentSong.value = picked
    currentIndex.value = idx
    mediaSession.updateMediaSession(currentSong.value)
    initialRandomAssigned = true

    lyricsStore.preloadLyrics(currentSong.value.lrc)
  }

  // ========== 监听音量变化 ==========
  watch(
    () => volumeStore.volume,
    v => {
      const audio = getAudio()
      if (!audio) return
      try {
        audio.volume = v
      } catch (e) {
        /* noop */
      }
    }
  )

  watch(
    () => volumeStore.muted,
    m => {
      const audio = getAudio()
      if (!audio) return
      try {
        audio.muted = m
      } catch (e) {
        /* noop */
      }
    }
  )

  return {
    // ========== 状态 ==========
    songs: computed(() => dataStore.songs),
    artists: computed(() => dataStore.artists),
    albums: computed(() => dataStore.albums),
    homeLoading: computed(() => dataStore.homeLoading),
    allArtists: computed(() => dataStore.allArtists),
    artistsLoading: computed(() => dataStore.artistsLoading),
    artistsHasMore: computed(() => dataStore.artistsHasMore),
    allAlbums: computed(() => dataStore.allAlbums),
    albumsLoading: computed(() => dataStore.albumsLoading),
    albumsHasMore: computed(() => dataStore.albumsHasMore),
    loading: ref(false), // 废弃，保留向后兼容
    currentIndex,
    isPlaying,
    currentSong,
    currentTime,
    duration,

    // ========== 歌词相关 ==========
    lyrics: computed(() => lyricsStore.lyrics),
    lyricsLoading: computed(() => lyricsStore.lyricsLoading),
    parsedLyrics: computed(() => lyricsStore.parsedLyrics),
    lyricsModal: computed(() => lyricsStore.lyricsModal),
    currentLyricLine: computed(() => lyricsStore.currentLyricLine),

    // ========== 播放模式和列表 ==========
    playMode: playlistManagement.playMode,
    playlists: playlistManagement.playlists,
    currentPlaylistId: playlistManagement.currentPlaylistId,

    // ========== Computed ==========
    isCurrentSongInList: playlistManagement.isCurrentSongInList,
    currentSongIndex: playlistManagement.currentSongIndex,
    currentPlaylist: playlistManagement.currentPlaylist,
    playlistItems: playlistManagement.playlistItems,
    hasPrev: playlistManagement.hasPrev,
    hasNext: playlistManagement.hasNext,

    // ========== 音频管理 ==========
    audioRef,
    initAudio,
    getAudio,

    // ========== 播放控制 ==========
    fetchHomeData,
    playSong,
    playPrevSong,
    playNextSong,
    togglePlay,
    updateProgress,
    setProgress,
    reset,
    dispose,
    removeSong,
    clearSongs,

    // ========== 数据获取 ==========
    searchSongs: dataStore.searchSongs,
    searchAlbums: dataStore.searchAlbums,
    searchArtists: dataStore.searchArtists,
    loadAllArtists: dataStore.loadAllArtists,
    loadAllAlbums: dataStore.loadAllAlbums,

    // ========== 歌词 ==========
    showCurrentLyrics: () => lyricsStore.showLyrics(currentSong.value?.lrc),
    seekTo: (timeMs: number) => {
      lyricsStore.seekTo(timeMs, getAudio)
      isPlaying.value = true
      mediaSession.updateMediaSessionPosition(getAudio, currentTime.value, duration.value)
    },
    startLyricSync: () => lyricsStore.startLyricSync(getAudio),
    stopLyricSync: lyricsStore.stopLyricSync,
    beginSeek: lyricsStore.beginSeek,
    endSeek: lyricsStore.endSeek,

    // ========== 播放列表 ==========
    setPlayMode: playlistManagement.setPlayMode,
    setPlaylist: playlistManagement.setPlaylist,
    addToPlaylist: playlistManagement.addToPlaylist,

    // ========== 音量控制 ==========
    volume: computed(() => volumeStore.volume),
    previousVolume: computed(() => volumeStore.previousVolume),
    muted: computed(() => volumeStore.muted),
    setVolume: (v: number) => volumeStore.setVolume(v, getAudio()),
    toggleMute: () => volumeStore.toggleMute(getAudio()),

    // ========== 缓冲 ==========
    bufferedPercent: bufferManagement.bufferedPercent,
    bufferedRanges: bufferManagement.bufferedRanges,
    updateBuffered: () => bufferManagement.updateBuffered(getAudio, duration.value),
    attachBufferListeners: () => bufferManagement.attachBufferListeners(getAudio, duration.value),
    detachBufferListeners: () => bufferManagement.detachBufferListeners(getAudio)
  }
})
