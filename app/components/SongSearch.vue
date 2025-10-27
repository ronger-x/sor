<template>
  <div class="flex flex-col md:flex-row items-center gap-4 w-full">
    <UInput v-model="query" placeholder="搜索歌曲名..." @keyup.enter="search" class="flex-1" />
    <UButton @click="search" color="primary">搜索</UButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSongsStore } from '@/stores/songs'
import { useRuntimeConfig } from '#imports'

const songsStore = useSongsStore()
const query = ref('')

const search = async () => {
  await songsStore.searchSongs(query.value)
}
</script>
