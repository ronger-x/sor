import { ref, computed, type Ref } from 'vue'
import type { Song } from '@/types'

export function usePlaylistManagement(currentSong: Ref<Song | null>) {
  const playlists = ref<{ id: string; name: string; items: Song[] }[]>([])
  const currentPlaylistId = ref<string | null>(null)
  const playMode = ref<'sequential' | 'repeat-one' | 'shuffle'>('sequential')
  const shuffledOrder = ref<number[]>([])
  let shuffleIndex = 0

  // Computed: 获取当前播放列表
  const currentPlaylist = computed(() => {
    if (!currentPlaylistId.value) return null
    return playlists.value.find(p => p.id === currentPlaylistId.value) || null
  })

  // Computed: 当前播放列表的歌曲数组
  const playlistItems = computed(() => currentPlaylist.value?.items || [])

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

  /**
   * 确保随机播放顺序
   */
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

  /**
   * 设置播放列表
   */
  function setPlaylist(id: string, name: string, items: Song[]) {
    const existing = playlists.value.find(p => p.id === id)
    if (existing) {
      existing.items = items.slice()
      existing.name = name
    } else {
      playlists.value.push({ id, name, items: items.slice() })
    }
    currentPlaylistId.value = id
    shuffledOrder.value = []
  }

  /**
   * 添加歌曲到播放列表
   */
  function addToPlaylist(id: string, items: Song[]) {
    const pl = playlists.value.find(p => p.id === id)
    if (!pl) return
    pl.items.push(...items)
    shuffledOrder.value = []
  }

  /**
   * 设置播放模式
   */
  function setPlayMode(mode: 'sequential' | 'repeat-one' | 'shuffle') {
    playMode.value = mode
    if (mode === 'shuffle') {
      shuffledOrder.value = []
      ensureShuffle()
    }
  }

  /**
   * 移除歌曲
   */
  function removeSong(index: number) {
    if (!currentPlaylist.value) return
    const items = playlistItems.value
    if (index < 0 || index >= items.length) return

    const wasCurrent = currentSongIndex.value === index

    currentPlaylist.value.items.splice(index, 1)

    if (!currentPlaylist.value.items.length) {
      return { isEmpty: true, newSong: null }
    }

    shuffledOrder.value = []
    ensureShuffle()

    if (wasCurrent) {
      const newIndex = Math.min(index, currentPlaylist.value.items.length - 1)
      const replacement = currentPlaylist.value.items[newIndex]
      return { isEmpty: false, newSong: replacement || null, newIndex }
    }

    return { isEmpty: false, newSong: null }
  }

  /**
   * 清空播放列表
   */
  function clearPlaylist() {
    if (!currentPlaylist.value) return
    currentPlaylist.value.items = []
  }

  /**
   * 获取下一首歌曲索引
   */
  function getNextSongIndex(): number | null {
    const items = playlistItems.value
    if (!items.length) return null

    const idx = currentSongIndex.value

    // 单曲循环
    if (playMode.value === 'repeat-one' && idx >= 0) {
      return idx
    }

    // 随机播放
    if (playMode.value === 'shuffle') {
      ensureShuffle()
      shuffleIndex = (shuffleIndex + 1) % shuffledOrder.value.length
      return shuffledOrder.value[shuffleIndex] ?? null
    }

    // 顺序播放
    if (idx === -1) return 0
    if (idx < items.length - 1) return idx + 1
    return 0 // 循环到第一首
  }

  /**
   * 获取上一首歌曲索引
   */
  function getPrevSongIndex(): number | null {
    const items = playlistItems.value
    if (!items.length) return null

    const idx = currentSongIndex.value

    // 单曲循环
    if (playMode.value === 'repeat-one' && idx >= 0) {
      return idx
    }

    // 随机播放
    if (playMode.value === 'shuffle') {
      ensureShuffle()
      shuffleIndex = (shuffleIndex - 1 + shuffledOrder.value.length) % shuffledOrder.value.length
      return shuffledOrder.value[shuffleIndex] ?? null
    }

    // 顺序播放
    if (idx <= 0) return 0
    return idx - 1
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

  function resetShuffle() {
    shuffledOrder.value = []
    shuffleIndex = 0
  }

  return {
    playlists,
    currentPlaylistId,
    playMode,
    shuffledOrder,
    currentPlaylist,
    playlistItems,
    isCurrentSongInList,
    currentSongIndex,
    hasPrev,
    hasNext,
    ensureShuffle,
    setPlaylist,
    addToPlaylist,
    setPlayMode,
    removeSong,
    clearPlaylist,
    getNextSongIndex,
    getPrevSongIndex,
    resetShuffle
  }
}
