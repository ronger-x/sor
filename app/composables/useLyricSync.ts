import { ref, type Ref } from 'vue'

export function useLyricSync() {
  const parsedLyrics = ref<{ time: number; text: string }[]>([])
  const currentLyricLine = ref(0)
  const isUserSeeking = ref(false)

  let lyricRaf: number | null = null
  const lyricSyncIntervalMs = 100
  let lastLyricSyncTs = 0

  /**
   * 解析 LRC 歌词格式
   */
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

  /**
   * 二分查找定位歌词行（给定毫秒）
   */
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

  /**
   * 启动歌词同步
   */
  function startLyricSync(getAudio: () => HTMLAudioElement | null) {
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
        lastLyricSyncTs = ts
      }
      lyricRaf = requestAnimationFrame(sync)
    }
    lyricRaf = requestAnimationFrame(sync)
  }

  /**
   * 停止歌词同步
   */
  function stopLyricSync() {
    if (lyricRaf) {
      cancelAnimationFrame(lyricRaf)
      lyricRaf = null
    }
    lastLyricSyncTs = 0
  }

  /**
   * 开始拖动进度（暂停歌词同步）
   */
  function beginSeek() {
    isUserSeeking.value = true
  }

  /**
   * 结束拖动进度（恢复歌词同步）
   */
  function endSeek() {
    isUserSeeking.value = false
  }

  /**
   * 跳转到指定时间并更新歌词
   */
  function seekTo(timeMs: number, getAudio: () => HTMLAudioElement | null) {
    const audio = getAudio()
    if (!audio) return

    try {
      audio.currentTime = timeMs / 1000
      audio.play().catch(e => {
        console.warn('Failed to play after seek:', e)
      })
      currentLyricLine.value = findLyricLine(timeMs)
    } catch (e) {
      console.warn('seek failed', e)
    }
  }

  return {
    parsedLyrics,
    currentLyricLine,
    isUserSeeking,
    parseLRC,
    findLyricLine,
    startLyricSync,
    stopLyricSync,
    beginSeek,
    endSeek,
    seekTo
  }
}
