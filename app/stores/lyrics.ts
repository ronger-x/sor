import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useLyricSync } from '@/composables/useLyricSync'
import type { LyricViewMode } from '@/types'

/**
 * 歌词管理 Store
 */
export const useLyricsStore = defineStore('lyrics', () => {
  const lyrics = ref('')
  const lyricsLoading = ref(false)
  const lyricsModal = ref(false)
  const lyricsPanelOpen = ref(false)
  const lyricViewMode = ref<LyricViewMode>('vinyl')

  // LRC 缓存 (key = lrc url)
  const lrcCache = new Map<string, { raw: string; parsed: { time: number; text: string }[] }>()

  // 使用歌词同步 composable
  const lyricSync = useLyricSync()

  /**
   * 显示当前歌曲的歌词
   */
  async function showLyrics(lrcUrl?: string | null) {
    if (!lrcUrl) {
      lyrics.value = '暂无歌词'
      lyricsLoading.value = false
      lyricSync.parsedLyrics.value = []
      lyricSync.currentLyricLine.value = 0
      return
    }

    lyricsModal.value = true
    lyrics.value = ''
    lyricsLoading.value = true
    lyricSync.parsedLyrics.value = []
    lyricSync.currentLyricLine.value = 0

    try {
      const params: Record<string, any> = { url: lrcUrl }
      Object.keys(params).forEach(k => params[k] === undefined && delete params[k])

      if (lrcCache.has(lrcUrl)) {
        const cached = lrcCache.get(lrcUrl)!
        lyrics.value = cached.raw
        lyricSync.parsedLyrics.value = cached.parsed
      } else {
        const lrc = await $fetch('/api/lyrics', { params })
        lyrics.value = lrc as string
        const parsed = lyricSync.parseLRC(lyrics.value)
        lyricSync.parsedLyrics.value = parsed
        lrcCache.set(lrcUrl, { raw: lyrics.value, parsed })
      }
    } catch (e) {
      lyrics.value = '歌词加载失败'
      console.error('Failed to load lyrics:', e)
    } finally {
      lyricsLoading.value = false
    }
  }

  /**
   * 预加载歌词
   */
  async function preloadLyrics(lrcUrl?: string | null) {
    if (!lrcUrl || lrcCache.has(lrcUrl)) return

    try {
      const lrc = await $fetch('/api/lyrics', { params: { url: lrcUrl } })
      const raw = String(lrc || '')
      const parsed = lyricSync.parseLRC(raw)
      lrcCache.set(lrcUrl, { raw, parsed })
    } catch {
      // 忽略预加载错误
    }
  }

  /**
   * 关闭歌词弹窗
   */
  function closeLyricsModal() {
    lyricsModal.value = false
    lyricsPanelOpen.value = false
  }

  function openLyricsPanel(mode?: LyricViewMode) {
    if (mode) lyricViewMode.value = mode
    lyricsPanelOpen.value = true
    lyricsModal.value = true
  }

  function closeLyricsPanel() {
    lyricsPanelOpen.value = false
    lyricsModal.value = false
  }

  function setLyricViewMode(mode: LyricViewMode) {
    lyricViewMode.value = mode
  }

  return {
    lyrics,
    lyricsLoading,
    lyricsModal,
    lyricsPanelOpen,
    lyricViewMode,
    parsedLyrics: lyricSync.parsedLyrics,
    currentLyricLine: lyricSync.currentLyricLine,
    isUserSeeking: lyricSync.isUserSeeking,
    showLyrics,
    preloadLyrics,
    closeLyricsModal,
    openLyricsPanel,
    closeLyricsPanel,
    setLyricViewMode,
    startLyricSync: lyricSync.startLyricSync,
    stopLyricSync: lyricSync.stopLyricSync,
    beginSeek: lyricSync.beginSeek,
    endSeek: lyricSync.endSeek,
    seekTo: lyricSync.seekTo,
    findLyricLine: lyricSync.findLyricLine
  }
})
