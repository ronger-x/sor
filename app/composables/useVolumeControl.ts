import type { ComputedRef, Ref } from 'vue'

/**
 * 音量控制相关
 */
export function useVolumeControl(volume: ComputedRef<number>, muted: ComputedRef<boolean>) {
  const volumeIcon = computed(() => {
    if (muted.value || (volume.value ?? 1) === 0) return 'i-lucide-volume-off'
    if ((volume.value ?? 1) < 0.5) return 'i-lucide-volume-1'
    return 'i-lucide-volume-2'
  })

  const volumeLabel = computed(() => {
    if (muted.value || (volume.value ?? 1) === 0) return '静音'
    if ((volume.value ?? 1) < 0.5) return '音量: 低'
    return '音量: 高'
  })

  return {
    volumeIcon,
    volumeLabel
  }
}
