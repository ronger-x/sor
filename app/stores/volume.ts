import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/**
 * 音量控制 Store
 */
export const useVolumeStore = defineStore('volume', () => {
  const volume = ref(0.5) // 0.0 - 1.0
  const previousVolume = ref(0.5)
  const muted = ref(false)

  /**
   * 设置音量
   */
  function setVolume(v: number, audio: HTMLAudioElement | null) {
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

  /**
   * 切换静音
   */
  function toggleMute(audio: HTMLAudioElement | null) {
    if (muted.value) {
      muted.value = false
      if (volume.value === 0) {
        volume.value = previousVolume.value || 0.5
      }
    } else {
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

  /**
   * 应用音量设置到音频元素
   */
  function applyVolumeSettings(audio: HTMLAudioElement) {
    try {
      audio.volume = volume.value
      audio.muted = muted.value
    } catch (e) {
      console.warn('Failed to apply volume settings:', e)
    }
  }

  return {
    volume,
    previousVolume,
    muted,
    setVolume,
    toggleMute,
    applyVolumeSettings
  }
})
