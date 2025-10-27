<template>
  <UContainer class="min-h-screen flex flex-col bg-gray-50">
    <UHeader class="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
      <template #left>
        <span class="text-xl font-bold tracking-wide">S.O.R Music</span>
      </template>
      <template #right>
        <SongSearch />
      </template>
    </UHeader>

    <UMain
      class="flex-1 flex flex-col items-center justify-start w-full max-w-5xl mx-auto px-2 py-6"
    >
      <slot />
    </UMain>

    <UFooter class="w-full bg-white border-t shadow z-30 px-0 py-0 sticky bottom-0">
      <PlayerBar />
    </UFooter>
  </UContainer>
</template>
<script setup lang="ts">
import SongSearch from '@/components/SongSearch.vue'
import PlayerBar from '@/components/PlayerBar.vue'
</script>
