<template>
  <div class="lyric-route">
    <div class="lyric-route__toolbar">
      <div class="min-w-0">
        <p class="text-xs text-muted">兼容歌词页</p>
        <h1 class="truncate text-xl font-bold">
          {{ songsStore.currentSong?.name || '视觉歌词' }}
        </h1>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <UButton
          v-for="mode in modes"
          :key="mode.value"
          :icon="mode.icon"
          :variant="songsStore.lyricViewMode === mode.value ? 'solid' : 'soft'"
          :color="songsStore.lyricViewMode === mode.value ? 'primary' : 'neutral'"
          size="sm"
          @click="songsStore.setLyricViewMode(mode.value)"
        >
          {{ mode.label }}
        </UButton>
        <UButton icon="i-lucide-house" variant="ghost" to="/">首页</UButton>
      </div>
    </div>
    <div class="lyric-route__stage">
      <LyricViewer
        :mode="songsStore.lyricViewMode"
        embedded
        :redirect-on-empty="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSongsStore } from '@/stores/songs'
import type { LyricViewMode } from '@/types'

const songsStore = useSongsStore()

const modes: Array<{ value: LyricViewMode; label: string; icon: string }> = [
  { value: 'vinyl', label: '唱片', icon: 'i-lucide-disc-3' },
  { value: 'focus', label: '沉浸', icon: 'i-lucide-align-center' },
  { value: 'compact', label: '紧凑', icon: 'i-lucide-list-music' }
]
</script>

<style scoped>
.lyric-route {
  display: flex;
  width: min(1180px, 100%);
  min-height: calc(100dvh - 10rem);
  flex-direction: column;
  gap: 1rem;
}

.lyric-route__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.lyric-route__stage {
  display: flex;
  flex-direction: column;
  height: max(540px, calc(100dvh - 15rem));
  min-height: 540px;
  flex: 1;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, currentColor 10%, transparent);
  border-radius: 0.75rem;
  background: color-mix(in oklab, Canvas 94%, currentColor 3%);
}

.lyric-route__stage :deep(.lyric-viewer) {
  flex: 1;
  min-height: 0;
}

@media (max-width: 768px) {
  .lyric-route {
    min-height: calc(100dvh - 9rem);
  }

  .lyric-route__toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .lyric-route__stage {
    height: calc(100dvh - 15rem);
    min-height: calc(100dvh - 15rem);
  }
}
</style>
