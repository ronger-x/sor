import { ref } from 'vue'

export function useBufferManagement() {
  const bufferedPercent = ref(0)
  const bufferedRanges = ref<{ start: number; end: number }[]>([])

  /**
   * 更新缓冲状态
   */
  function updateBuffered(getAudio: () => HTMLAudioElement | null, duration: number) {
    const audio = getAudio()
    if (!audio) return
    try {
      const ranges: { start: number; end: number }[] = []
      const br = audio.buffered
      for (let i = 0; i < br.length; i++) {
        ranges.push({ start: br.start(i), end: br.end(i) })
      }
      bufferedRanges.value = ranges
      if (ranges.length && duration) {
        const lastRange = ranges[ranges.length - 1]
        if (lastRange) {
          bufferedPercent.value = Math.min(1, lastRange.end / duration)
        }
      }
    } catch (e) {
      // ignore
    }
  }

  /**
   * 附加缓冲监听器
   */
  function attachBufferListeners(getAudio: () => HTMLAudioElement | null, duration: number) {
    const audio = getAudio()
    if (!audio) return
    const handler = () => updateBuffered(getAudio, duration)
    audio.addEventListener('progress', handler)
    audio.addEventListener('loadedmetadata', handler)
    audio.addEventListener('canplay', handler)
  }

  /**
   * 移除缓冲监听器
   */
  function detachBufferListeners(getAudio: () => HTMLAudioElement | null) {
    const audio = getAudio()
    if (!audio) return
    audio.removeEventListener('progress', updateBuffered as any)
    audio.removeEventListener('loadedmetadata', updateBuffered as any)
    audio.removeEventListener('canplay', updateBuffered as any)
  }

  return {
    bufferedPercent,
    bufferedRanges,
    updateBuffered,
    attachBufferListeners,
    detachBufferListeners
  }
}
