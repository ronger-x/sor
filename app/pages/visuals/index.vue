<template>
  <div class="container mx-auto space-y-6">
    <div>
      <h1 class="text-3xl font-bold">视觉歌词</h1>
      <p class="mt-2 text-sm text-muted">把封面、歌词和播放队列组合成类 MV 的观看入口。</p>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <UCard v-for="item in visuals" :key="item.name" class="card-surface border-theme">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold">{{ item.name }}</h2>
            <p class="text-xs text-muted">{{ item.count || 0 }} 首可播放</p>
          </div>
          <UButton icon="i-lucide-clapperboard" size="xs" variant="soft" @click="playVisual(item)" />
        </div>
      </UCard>
    </div>

    <UEmpty v-if="!visuals.length" icon="i-lucide-clapperboard" title="暂无视觉歌词频道" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSongsStore } from '@/stores/songs'
import type { DiscoveryChannel } from '@/types'

const songsStore = useSongsStore()
const visuals = ref<DiscoveryChannel[]>([])

const load = async () => {
  const channels: any = await songsStore.channels()
  visuals.value = channels.mv || []
}

const playVisual = async (item: DiscoveryChannel) => {
  const name = item.name.replace(/\s*视觉歌词$/, '')
  const songs = await songsStore.searchSongs(name, true, undefined, undefined, 24, undefined, {
    includeAssets: true
  })
  if (!songs.length) return
  songsStore.setPlaylist(`visual-${name}`, item.name, songs)
  await songsStore.playSong(0)
  await songsStore.openLyricsPanel('vinyl')
}

onMounted(load)
</script>

<style scoped>
.container {
  max-width: 980px;
}
</style>
