import type { PlayMode } from '@/types'
import type { ComputedRef } from 'vue'

/**
 * 播放模式图标和标签
 */
export function usePlayModeIcon(playMode: ComputedRef<PlayMode>) {
  const playModeIcon = computed(() => {
    switch (playMode.value) {
      case 'repeat-one':
        return 'i-lucide-repeat-1'
      case 'shuffle':
        return 'i-lucide-shuffle'
      default:
        return 'i-lucide-repeat'
    }
  })

  const playModeLabel = computed(() => {
    switch (playMode.value) {
      case 'repeat-one':
        return '单曲循环'
      case 'shuffle':
        return '随机播放'
      default:
        return '顺序播放'
    }
  })

  return {
    playModeIcon,
    playModeLabel
  }
}
