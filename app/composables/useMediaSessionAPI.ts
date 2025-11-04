import type { Song } from '@/types'
import type { Ref } from 'vue'

export function useMediaSessionAPI() {
  /**
   * 设置 Media Session 处理器
   */
  function setupMediaSessionHandlers(handlers: {
    onPlay: () => void
    onPause: () => void
    onNext: () => void
    onPrev: () => void
    onSeek: (time: number) => void
  }) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.setActionHandler('play', handlers.onPlay)
      navigator.mediaSession.setActionHandler('pause', handlers.onPause)
      navigator.mediaSession.setActionHandler('nexttrack', handlers.onNext)
      navigator.mediaSession.setActionHandler('previoustrack', handlers.onPrev)
      navigator.mediaSession.setActionHandler('seekto', (details: any) => {
        if (details?.seekTime != null) {
          handlers.onSeek(details.seekTime * 1000)
        }
      })
    } catch (e) {
      console.warn('MediaSession handlers failed:', e)
    }
  }

  /**
   * 更新 Media Session 元数据
   */
  function updateMediaSession(song: Song | null) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
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
    } catch (e) {
      console.warn('Failed to set media session metadata:', e)
    }
  }

  /**
   * 更新播放状态
   */
  function updateMediaSessionPlaybackState(isPlaying: boolean, forceStopped = false) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.playbackState = forceStopped
        ? 'none'
        : isPlaying
        ? 'playing'
        : 'paused'
    } catch (e) {
      /* noop */
    }
  }

  /**
   * 更新播放位置
   */
  function updateMediaSessionPosition(
    getAudio: () => HTMLAudioElement | null,
    currentTime: number,
    duration: number
  ) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    const audio = getAudio()
    if (!audio || typeof (navigator.mediaSession as any).setPositionState !== 'function') return
    try {
      ;(navigator.mediaSession as any).setPositionState({
        duration: isFinite(audio.duration) ? audio.duration : duration || 0,
        playbackRate: audio.playbackRate || 1,
        position: audio.currentTime || currentTime
      })
    } catch (e) {
      /* noop */
    }
  }

  return {
    setupMediaSessionHandlers,
    updateMediaSession,
    updateMediaSessionPlaybackState,
    updateMediaSessionPosition
  }
}
