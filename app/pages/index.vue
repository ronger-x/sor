<template>
  <div class="container mx-auto py-8">
    <div v-if="songs && songs.length" class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      <UCard
        v-for="(song, idx) in songs"
        :key="song.url"
        class="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition text-center"
        @click="$emit('play-song', idx)"
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
import type { Song } from '@/types'
const props = defineProps<{ songs: Song[] }>()
const emit = defineEmits(['play-song'])
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
