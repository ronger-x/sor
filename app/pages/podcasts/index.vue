<template>
  <div class="container mx-auto space-y-6">
    <div>
      <h1 class="text-3xl font-bold">播客专题</h1>
      <p class="mt-2 text-sm text-muted">用你的曲库按歌手和专辑生成专题频道。</p>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <UCard v-for="item in podcasts" :key="item.name" class="card-surface border-theme">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold">{{ item.name }}</h2>
            <p class="text-xs text-muted">{{ item.count || 0 }} 首相关内容</p>
          </div>
          <UButton icon="i-lucide-play" size="xs" variant="soft" @click="playTopic(item)" />
        </div>
      </UCard>
    </div>

    <UEmpty v-if="!podcasts.length" icon="i-lucide-podcast" title="暂无专题" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSongsStore } from '@/stores/songs'
import type { DiscoveryChannel } from '@/types'

const songsStore = useSongsStore()
const podcasts = ref<DiscoveryChannel[]>([])

const load = async () => {
  const channels: any = await songsStore.channels()
  podcasts.value = channels.podcasts || []
}

const playTopic = async (item: DiscoveryChannel) => {
  const name = item.name.replace(/\s*专题$/, '')
  const songs = await songsStore.searchSongs(name, true, undefined, undefined, 24, undefined, {
    includeAssets: true
  })
  if (!songs.length) return
  songsStore.setPlaylist(`podcast-${name}`, item.name, songs)
  songsStore.playSong(0)
}

onMounted(load)
</script>

<style scoped>
.container {
  max-width: 980px;
}
</style>
