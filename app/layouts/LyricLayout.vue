<template>
  <UContainer class="min-h-screen flex flex-col bg-gray-50">
    <UHeader class="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
      <template #left>
        <UButton
          icon="i-heroicons-arrow-left"
          variant="ghost"
          @click="$emit('back')"
          class="mr-2"
        />
        <span class="text-xl font-bold tracking-wide">歌词展示</span>
      </template>
    </UHeader>
    <UMain
      class="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-2 py-6"
    >
      <slot />
    </UMain>
  </UContainer>
</template>

<script setup lang="ts">
const emit = defineEmits(['back'])
</script>
