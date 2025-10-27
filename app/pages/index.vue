<template>
  <div class="container mx-auto py-8">
    <div
      v-if="songsStore.songs && songsStore.songs.length"
      class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8"
    >
      <UCard
        v-for="(song, idx) in songsStore.songs"
        :key="song.url"
        class="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition text-center"
        @click="playSong(idx)"
      >
        <img
          :src="song.cover"
          :alt="song.name"
          class="w-32 h-32 object-cover rounded mb-4 mx-auto"
        />
        <div class="font-bold text-lg w-full">{{ song.name }}</div>
        <div class="text-gray-500 mb-2 w-full">{{ song.artist }}</div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSongsStore } from '@/stores/songs'
import { useRuntimeConfig } from '#imports'

const songsStore = useSongsStore()

const playSong = (idx: number) => {
  // 直接调用 pinia 的 playSong 方法，audioRef 由 PlayerBar 组件管理
  songsStore.playSong(idx)
}

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
