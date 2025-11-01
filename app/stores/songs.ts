import { defineStore } from 'pinia'
import { ref, computed, nextTick, watch } from 'vue'
import type { Song } from '@/types'

export const useSongsStore = defineStore('songs', () => {
  const songs = ref<Song[]>([])
  // 播放列表（当前使用 songs 作为播放列表，可选扩展多个）
  const playlists = ref<{ id: string; name: string; items: Song[] }[]>([])
  const currentPlaylistId = ref<string | null>(null)
  const loading = ref(false)
  // Deprecated: currentIndex (use currentSongIndex). Kept for backward compatibility.
  const currentIndex = ref(-1)
  const isPlaying = ref(false)
  const lyrics = ref('')
  const lyricsLoading = ref(false)
  const parsedLyrics = ref<{ time: number; text: string }[]>([])
  const lyricsModal = ref(false)
  const currentLyricLine = ref(0)
  // LRC 缓存 (key = lrc url)
  const lrcCache = new Map<string, { raw: string; parsed: { time: number; text: string }[] }>()

  // 播放进度相关状态
  const currentTime = ref(0)
  const duration = ref(0)
  // 缓冲相关
  const bufferedPercent = ref(0)
  const bufferedRanges = ref<{ start: number; end: number }[]>([])

  // volume control
  const volume = ref(0.5) // range 0.0 - 1.0
  const previousVolume = ref(0.5) // remember last non-zero volume for mute toggle restore
  const muted = ref(false)

  // ⭐ 全局唯一的 audioRef
  const audioRef = ref<HTMLAudioElement | null>(null)

  // 歌词高亮同步 (requestAnimationFrame 比 setInterval 更平滑)
  let lyricRaf: number | null = null
  const lyricSyncIntervalMs = 100 // 控制歌词高亮刷新节流
  let lastLyricSyncTs = 0
  const isUserSeeking = ref(false) // 拖动进度条时暂停 rAF 更新

  // 播放模式: 'sequential' | 'repeat-one' | 'shuffle'
  const playMode = ref<'sequential' | 'repeat-one' | 'shuffle'>('sequential')
  const shuffledOrder = ref<number[]>([]) // 保存随机播放顺序
  let shuffleIndex = 0

  // 直接存储当前播放歌曲，避免 songs 变化影响播放
  const currentSong = ref<Song | null>(null)

  // Computed: 判断当前歌曲是否在播放列表中
  const isCurrentSongInList = computed(() => {
    if (!currentSong.value || !currentPlaylist.value) return false
    return currentPlaylist.value.items.some(s => s.url === currentSong.value?.url)
  })

  // Computed: 获取当前歌曲在播放列表中的索引
  const currentSongIndex = computed(() => {
    if (!currentSong.value || !currentPlaylist.value) return -1
    return currentPlaylist.value.items.findIndex(s => s.url === currentSong.value?.url)
  })

  // Computed: 获取当前播放列表
  const currentPlaylist = computed(() => {
    if (!currentPlaylistId.value) return null
    return playlists.value.find(p => p.id === currentPlaylistId.value) || null
  })

  // Computed: 当前播放列表的歌曲数组
  const playlistItems = computed(() => currentPlaylist.value?.items || [])

  function ensureShuffle() {
    if (playMode.value !== 'shuffle') return
    const items = playlistItems.value
    const curIdx = currentSongIndex.value
    const needRebuild =
      shuffledOrder.value.length !== items.length ||
      !shuffledOrder.value.every(i => i < items.length)
    if (!needRebuild) return
    const prevPos = Math.min(Math.max(shuffleIndex, 0), Math.max(items.length - 1, 0))
    if (curIdx < 0) {
      shuffledOrder.value = items.map((_, i) => i).sort(() => Math.random() - 0.5)
      shuffleIndex = 0
      return
    }
    const others = items.map((_, i) => i).filter(i => i !== curIdx)
    for (let i = others.length - 1; i > 0; i--) {
      const r = Math.floor(Math.random() * (i + 1))
      if (r < 0 || r >= others.length) continue
      const tmp = others[i]!
      const rv = others[r]!
      others[i] = rv
      others[r] = tmp
    }
    const insertPos = Math.min(prevPos, others.length)
    others.splice(insertPos, 0, curIdx)
    shuffledOrder.value = others
    shuffleIndex = insertPos
  }

  // Computed: 是否有上一首
  const hasPrev = computed(() => {
    const idx = currentSongIndex.value
    const items = playlistItems.value
    if (idx === -1) return items.length > 0
    return idx > 0
  })

  // Computed: 是否有下一首
  const hasNext = computed(() => {
    const idx = currentSongIndex.value
    const items = playlistItems.value
    if (idx === -1) return items.length > 0
    return idx < items.length - 1
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
    const sync = (ts: number) => {
      if (!audio) return
      if (
        !isUserSeeking.value &&
        (!lastLyricSyncTs || ts - lastLyricSyncTs >= lyricSyncIntervalMs)
      ) {
        const timeMs = (audio.currentTime || 0) * 1000
        currentLyricLine.value = findLyricLine(timeMs)
        currentTime.value = audio.currentTime || 0
        lastLyricSyncTs = ts
      }
      lyricRaf = requestAnimationFrame(sync)
    }
    lyricRaf = requestAnimationFrame(sync)
  }

  function stopLyricSync() {
    if (lyricRaf) {
      cancelAnimationFrame(lyricRaf)
      lyricRaf = null
    }
    lastLyricSyncTs = 0
  }

  async function fetchDefaultSongs() {
    await searchSongs('', true)
    // 初始加载时创建默认播放列表
    if (songs.value.length > 0 && !currentPlaylistId.value) {
      setPlaylist('default', '默认播放列表', songs.value)
    }
    await assignInitialRandomIfNeeded()
  }

  async function searchSongs(q: string, random?: boolean) {
    loading.value = true
    try {
      const params: Record<string, any> = { q, random, limit: 50 }
      Object.keys(params).forEach(k => params[k] === undefined && delete params[k])
      const res = await $fetch('/api/songs', { params })
      songs.value = res as Song[]
      // assignInitialRandomIfNeeded 仅在 fetchDefaultSongs 中调用
    } catch (e) {
      songs.value = []
      console.error('Failed to fetch songs:', e)
    } finally {
      loading.value = false
    }
  }

  // Guard: 当前播放任务的 token，避免竞争条件 (快速切歌)
  let playTokenCounter = 0

  async function playSong(idx: number) {
    const items = playlistItems.value

    // 处理索引越界
    if (idx < 0 || idx >= items.length) {
      console.warn('Invalid song index:', idx)
      return
    }

    const audio = getAudio()
    if (!audio) {
      console.warn('Audio element not initialized')
      return
    }

    // 如果没有播放列表，无法播放
    if (!currentPlaylist.value) {
      console.warn('No playlist available')
      return
    }

    currentIndex.value = idx // deprecated
    currentSong.value = items[idx] || null

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

    const token = ++playTokenCounter

    // 尝试加载并播放
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
      // 已有新的播放请求，放弃当前
      return
    }
    try {
      const playResult = audio.play()
      isPlaying.value = true
      await playResult
      duration.value = isFinite(audio.duration) ? audio.duration : 0
      startLyricSync()
      updateMediaSession()
    } catch (err) {
      isPlaying.value = false
      console.warn('audio play failed', err)
    }

    await showCurrentLyrics()
    preloadNextSong()
  }

  // 播放上一首
  async function playPrevSong() {
    const items = playlistItems.value
    if (!items.length) return
    if (playMode.value === 'repeat-one' && currentSongIndex.value >= 0) {
      await playSong(currentSongIndex.value)
      return
    }
    if (playMode.value === 'shuffle') {
      ensureShuffle()
      shuffleIndex = (shuffleIndex - 1 + shuffledOrder.value.length) % shuffledOrder.value.length
      const nextIdx = shuffledOrder.value[shuffleIndex]
      if (typeof nextIdx === 'number') {
        await playSong(nextIdx)
      }
      return
    }
    const idx = currentSongIndex.value
    if (idx <= 0) {
      await playSong(0)
    } else {
      await playSong(idx - 1)
    }
  }

  // 播放下一首
  async function playNextSong() {
    const items = playlistItems.value
    if (!items.length) return
    if (playMode.value === 'repeat-one' && currentSongIndex.value >= 0) {
      await playSong(currentSongIndex.value)
      return
    }
    if (playMode.value === 'shuffle') {
      ensureShuffle()
      shuffleIndex = (shuffleIndex + 1) % shuffledOrder.value.length
      const nextIdx = shuffledOrder.value[shuffleIndex]
      if (typeof nextIdx === 'number') {
        await playSong(nextIdx)
      }
      return
    }
    const idx = currentSongIndex.value
    if (idx === -1) {
      await playSong(0)
    } else if (idx < items.length - 1) {
      await playSong(idx + 1)
    } else {
      // 到末尾，循环到第一首
      await playSong(0)
    }
  }

  async function togglePlay() {
    const audio = getAudio()
    if (!audio) {
      console.warn('Audio element not initialized')
      return
    }

    // 如果没有当前歌曲，尝试播放播放列表的第一首
    if (!currentSong.value && playlistItems.value.length > 0) {
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
      try {
        audio.pause()
      } catch (e) {
        console.warn('pause failed', e)
      }
      isPlaying.value = false
      stopLyricSync()
      updateMediaSessionPlaybackState()
    } else {
      try {
        const playResult = audio.play()
        isPlaying.value = true
        await playResult
        if (!duration.value && isFinite(audio.duration)) {
          duration.value = audio.duration
        }
        startLyricSync()
        updateMediaSessionPlaybackState()
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
    if (nv > 0 && muted.value) {
      muted.value = false
    }
    if (nv > 0) previousVolume.value = nv
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
    if (muted.value) {
      // 取消静音，恢复之前的音量
      muted.value = false
      if (volume.value === 0) {
        volume.value = previousVolume.value || 0.5
      }
    } else {
      // 设置静音，记录当前音量
      if (volume.value > 0) previousVolume.value = volume.value
      muted.value = true
    }
    if (audio) {
      try {
        audio.muted = muted.value
        if (!muted.value) audio.volume = volume.value
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
      currentLyricLine.value = findLyricLine(timeMs)
      updateMediaSessionPosition()
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
      const lrcUrl = currentSong.value.lrc
      if (lrcUrl && lrcCache.has(lrcUrl)) {
        const cached = lrcCache.get(lrcUrl)!
        lyrics.value = cached.raw
        parsedLyrics.value = cached.parsed
      } else {
        const lrc = await $fetch('/api/lyrics', { params })
        lyrics.value = lrc as string
        const parsed = parseLRC(lyrics.value)
        parsedLyrics.value = parsed
        if (lrcUrl) lrcCache.set(lrcUrl, { raw: lyrics.value, parsed })
      }
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

  // 二分查找定位歌词行（给定毫秒）
  function findLyricLine(timeMs: number) {
    const arr = parsedLyrics.value
    const len = arr.length
    if (!len) return 0
    let lo = 0
    let hi = len - 1
    const first = arr[0]
    const last = arr[hi]
    if (!first || !last) return 0
    if (timeMs < first.time) return 0
    if (timeMs >= last.time) return hi
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const midItem = arr[mid]
      if (!midItem) break
      const t = midItem.time
      if (t === timeMs) return mid
      if (t < timeMs) lo = mid + 1
      else hi = mid - 1
    }
    return Math.max(0, lo - 1)
  }

  function seekTo(timeMs: number) {
    const audio = getAudio()
    if (!audio) return

    try {
      audio.currentTime = timeMs / 1000
      currentTime.value = timeMs / 1000
      audio.play().catch(e => {
        console.warn('Failed to play after seek:', e)
      })
      isPlaying.value = true

      currentLyricLine.value = findLyricLine(timeMs)
      updateMediaSessionPosition()
    } catch (e) {
      console.warn('seek failed', e)
    }
  }

  function updateBuffered() {
    const audio = getAudio()
    if (!audio) return
    try {
      const ranges: { start: number; end: number }[] = []
      const br = audio.buffered
      for (let i = 0; i < br.length; i++) {
        ranges.push({ start: br.start(i), end: br.end(i) })
      }
      bufferedRanges.value = ranges
      if (ranges.length && duration.value) {
        const lastRange = ranges[ranges.length - 1]
        if (lastRange) {
          bufferedPercent.value = Math.min(1, lastRange.end / duration.value)
        }
      }
    } catch (e) {
      // ignore
    }
  }

  function preloadNextSong() {
    const idx = currentSongIndex.value
    if (idx === -1) return
    const items = playlistItems.value
    const next = items[idx + 1]
    if (!next) return

    // 预加载歌词（保留歌词预加载因为这是可靠的）
    if (next.lrc && !lrcCache.has(next.lrc)) {
      $fetch('/api/lyrics', { params: { url: next.lrc } })
        .then((lrc: any) => {
          const raw = String(lrc || '')
          const parsed = parseLRC(raw)
          lrcCache.set(next.lrc!, { raw, parsed })
        })
        .catch(() => {})
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
    bufferedPercent.value = 0
    bufferedRanges.value = []
    updateMediaSessionPlaybackState(true)
    shuffledOrder.value = []
    shuffleIndex = 0
  }

  // ⭐ 清理资源（在应用卸载时调用）
  function dispose() {
    reset()
    audioRef.value = null
  }

  // Watchers: 确保外部修改 volume/muted 同步到 audio
  watch(volume, v => {
    const audio = getAudio()
    if (!audio) return
    try {
      audio.volume = v
    } catch (e) {
      /* noop */
    }
  })
  watch(muted, m => {
    const audio = getAudio()
    if (!audio) return
    try {
      audio.muted = m
    } catch (e) {
      /* noop */
    }
  })

  // 补充: 初始化后监听缓冲事件
  function attachBufferListeners() {
    const audio = getAudio()
    if (!audio) return
    audio.addEventListener('progress', updateBuffered)
    audio.addEventListener('loadedmetadata', updateBuffered)
    audio.addEventListener('canplay', updateBuffered)
  }
  function detachBufferListeners() {
    const audio = getAudio()
    if (!audio) return
    audio.removeEventListener('progress', updateBuffered)
    audio.removeEventListener('loadedmetadata', updateBuffered)
    audio.removeEventListener('canplay', updateBuffered)
  }

  // 修改 initAudio 附加缓冲监听
  const _origInit = initAudio
  function enhancedInitAudio(audio: HTMLAudioElement) {
    _origInit(audio)
    attachBufferListeners()
    setupMediaSessionHandlers()
  }

  // Media Session API 集成
  function setupMediaSessionHandlers() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.setActionHandler('play', async () => {
        if (!isPlaying.value) await togglePlay()
      })
      navigator.mediaSession.setActionHandler('pause', async () => {
        if (isPlaying.value) await togglePlay()
      })
      navigator.mediaSession.setActionHandler('nexttrack', () => playNextSong())
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevSong())
      navigator.mediaSession.setActionHandler('seekto', (details: any) => {
        if (details?.seekTime != null) {
          seekTo(details.seekTime * 1000)
        }
      })
    } catch (e) {
      // 某些浏览器可能不支持所有 handler
      console.warn('MediaSession handlers failed:', e)
    }
  }

  function updateMediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    const song = currentSong.value
    if (!song) return
    try {
      const meta: any = {
        title: song.name,
        artist: song.artist,
        artwork: song.cover ? [{ src: song.cover, sizes: '512x512', type: 'image/png' }] : []
      }
      if ('album' in song && (song as any).album) {
        meta.album = (song as any).album
      }
      navigator.mediaSession.metadata = new MediaMetadata(meta)
      updateMediaSessionPlaybackState()
      updateMediaSessionPosition()
    } catch (e) {
      console.warn('Failed to set media session metadata:', e)
    }
  }

  function updateMediaSessionPlaybackState(forceStopped = false) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.playbackState = forceStopped
        ? 'none'
        : isPlaying.value
        ? 'playing'
        : 'paused'
    } catch (e) {
      /* noop */
    }
  }

  function updateMediaSessionPosition() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    const audio = getAudio()
    if (!audio || typeof (navigator.mediaSession as any).setPositionState !== 'function') return
    try {
      ;(navigator.mediaSession as any).setPositionState({
        duration: isFinite(audio.duration) ? audio.duration : duration.value || 0,
        playbackRate: audio.playbackRate || 1,
        position: audio.currentTime || currentTime.value
      })
    } catch (e) {
      /* noop */
    }
  }

  // 播放列表管理
  function setPlaylist(id: string, name: string, items: Song[]) {
    const existing = playlists.value.find(p => p.id === id)
    if (existing) {
      existing.items = items.slice()
      existing.name = name
    } else {
      playlists.value.push({ id, name, items: items.slice() })
    }
    currentPlaylistId.value = id
    shuffledOrder.value = [] // 重置随机顺序
  }

  function addToPlaylist(id: string, items: Song[]) {
    const pl = playlists.value.find(p => p.id === id)
    if (!pl) return
    pl.items.push(...items)
    shuffledOrder.value = []
  }

  function setPlayMode(mode: 'sequential' | 'repeat-one' | 'shuffle') {
    playMode.value = mode
    if (mode === 'shuffle') {
      shuffledOrder.value = []
      ensureShuffle()
    }
  }

  // 用户拖动进度时暂停歌词同步
  function beginSeek() {
    isUserSeeking.value = true
  }
  function endSeek() {
    isUserSeeking.value = false
  }

  // 初次加载后随机挑一首但不播放
  let initialRandomAssigned = false
  async function assignInitialRandomIfNeeded() {
    if (initialRandomAssigned) return
    const items = playlistItems.value
    if (!items.length) return
    const idx = Math.floor(Math.random() * items.length)
    const picked = items[idx]
    if (!picked) return
    currentSong.value = picked
    currentIndex.value = idx
    // 不播放，只设置 metadata
    updateMediaSession()
    initialRandomAssigned = true
    // 可选：预加载歌词但不解析 (保持快速)
    try {
      if (!currentSong.value) return
      const lrcUrl = currentSong.value.lrc
      if (lrcUrl && !lrcCache.has(lrcUrl)) {
        const lrc = await $fetch('/api/lyrics', { params: { url: lrcUrl } })
        const raw = String(lrc || '')
        const parsed = parseLRC(raw)
        lrcCache.set(lrcUrl, { raw, parsed })
      }
    } catch {
      /* ignore */
    }
  }

  function removeSong(index: number) {
    if (!currentPlaylist.value) return
    const items = playlistItems.value
    if (index < 0 || index >= items.length) return

    const wasCurrent = currentSongIndex.value === index

    // 从播放列表中移除
    currentPlaylist.value.items.splice(index, 1)

    // 同步更新 songs（如果当前播放列表是默认播放列表）
    if (currentPlaylistId.value === 'default') {
      songs.value = currentPlaylist.value.items.slice()
    }

    if (!currentPlaylist.value.items.length) {
      reset()
      return
    }

    shuffledOrder.value = []
    ensureShuffle()

    if (wasCurrent) {
      const newIndex = Math.min(index, currentPlaylist.value.items.length - 1)
      const replacement = currentPlaylist.value.items[newIndex]
      if (replacement) {
        currentSong.value = replacement
        currentIndex.value = newIndex
        updateMediaSession()
      }
    }
  }

  function clearSongs() {
    if (!currentPlaylist.value) return

    // 清空当前播放列表
    currentPlaylist.value.items = []

    // 同步更新 songs（如果当前播放列表是默认播放列表）
    if (currentPlaylistId.value === 'default') {
      songs.value = []
    }

    reset()
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
    playMode,
    playlists,
    currentPlaylistId,

    // Computed
    isCurrentSongInList,
    currentSongIndex,
    currentPlaylist,
    playlistItems,
    hasPrev,
    hasNext,

    // Audio management
    audioRef,
    initAudio: enhancedInitAudio,
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
    setPlayMode,
    beginSeek,
    endSeek,
    setPlaylist,
    addToPlaylist,
    removeSong,
    clearSongs,

    // volume controls
    volume,
    previousVolume,
    muted,
    setVolume,
    toggleMute,
    // buffered
    bufferedPercent,
    bufferedRanges,
    updateBuffered,
    attachBufferListeners,
    detachBufferListeners
  }
})
