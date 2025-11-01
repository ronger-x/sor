<template>
  <div class="container mx-auto">
    <div v-if="songsStore.songs && songsStore.songs.length" class="relative">
      <!-- Refresh button positioned at the top-right of the songs list -->
      <div class="absolute top-0 right-0 z-10">
        <UButton icon="i-lucide-refresh-cw" subtle @click="reloadSongs">换一批</UButton>
      </div>
      <!-- 加载状态 -->
      <div v-if="songsLoading" class="flex items-center justify-center h-full">
        <div class="text-center">
          <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl mb-2" />
          <p class="text-sm text-gray-500">加载歌曲中...</p>
        </div>
      </div>
      <!-- Grid of song cards — add top padding so the button doesn't overlap content -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
        <UCard
          v-for="(song, idx) in songsStore.songs"
          :key="song.url"
          :class="['card-surface', 'border-theme', cardClasses]"
          @click="playSong(idx)"
        >
          <NuxtImg
            :src="song.cover"
            :alt="song.name"
            class="w-32 h-32 object-cover rounded mb-4 mx-auto"
          />
          <div class="font-bold text-lg w-full">{{ song.name }}</div>
          <div>{{ song.artist }}</div>
        </UCard>
      </div>
    </div>
    <div v-else>
      <UEmpty icon="i-lucide-music" title="没有找到相关歌曲">
        <template #actions>
          <UButton icon="i-lucide-refresh-cw" subtle @click="songsStore.fetchDefaultSongs"
            >刷新歌曲列表</UButton
          >
        </template>
      </UEmpty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useSongsStore } from '@/stores/songs'

const songsStore = useSongsStore()

const songsLoading = computed(() => songsStore.loading)

const playSong = (idx: number) => {
  // 首页点击歌曲时，将当前搜索结果设置为播放列表
  if (!songsStore.currentPlaylistId || songsStore.currentPlaylistId === 'default') {
    songsStore.setPlaylist('default', '当前播放', songsStore.songs)
  }
  // 然后播放歌曲
  songsStore.playSong(idx)
}

const reloadSongs = () => {
  songsStore.searchSongs('', true)
}

const cardClasses = computed(() =>
  [
    'flex',
    'flex-col',
    'items-center',
    'justify-center',
    'cursor-pointer',
    'transition',
    'text-center'
  ].join(' ')
)

onMounted(() => {
  if (!songsStore.songs.length) {
    songsStore.fetchDefaultSongs()
  }
})
</script>

<style scoped>
.container {
  max-width: 900px;
}
.grid > * {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
