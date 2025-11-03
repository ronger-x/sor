/**
 * 格式化时间 (秒 -> mm:ss)
 */
export function useFormatTime() {
  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return {
    formatTime
  }
}
