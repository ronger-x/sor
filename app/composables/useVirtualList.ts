import { computed, ref, type Ref } from 'vue'

interface UseVirtualListOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number
}

export function useVirtualList<T>(items: Ref<T[]>, options: UseVirtualListOptions) {
  const { itemHeight, containerHeight, overscan = 3 } = options
  const scrollTop = ref(0)

  // 计算可见区域
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const totalHeight = computed(() => items.value.length * itemHeight)

  // 计算当前可见的起始和结束索引
  const startIndex = computed(() => {
    // 如果列表项数量少，直接返回0
    if (items.value.length <= visibleCount + overscan * 2) {
      return 0
    }
    const index = Math.floor(scrollTop.value / itemHeight)
    return Math.max(0, index - overscan)
  })

  const endIndex = computed(() => {
    // 如果列表项数量少，直接返回全部
    if (items.value.length <= visibleCount + overscan * 2) {
      return items.value.length
    }
    const index = Math.ceil((scrollTop.value + containerHeight) / itemHeight)
    return Math.min(items.value.length, index + overscan)
  })

  // 获取当前可见的项目
  const visibleItems = computed(() => {
    return items.value.slice(startIndex.value, endIndex.value).map((item, i) => ({
      item,
      index: startIndex.value + i
    }))
  })

  // 计算偏移量
  const offsetY = computed(() => startIndex.value * itemHeight)

  // 滚动事件处理
  const onScroll = (event: Event) => {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
  }

  // 滚动到指定索引
  const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const targetScrollTop = index * itemHeight - containerHeight / 2 + itemHeight / 2
    return Math.max(0, Math.min(targetScrollTop, totalHeight.value - containerHeight))
  }

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll,
    scrollToIndex,
    startIndex,
    endIndex
  }
}
