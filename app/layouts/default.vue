<template>
  <UContainer class="min-h-screen flex flex-col">
    <UHeader class="sticky top-0 z-20 backdrop-blur" :toggle="false">
      <template #title>
        <span class="text-xl font-bold tracking-wide text-primary">S.O.R Music</span>
      </template>
      <SongSearch />
      <template #right>
        <UColorModeButton />
        <UButton
          icon="i-lucide-github"
          color="neutral"
          variant="ghost"
          to="https://github.com/ronger-x/sor"
          target="_blank"
        />
      </template>
    </UHeader>

    <UMain
      class="flex-1 flex flex-col items-center justify-start w-full max-w-5xl mx-auto px-2 py-6 md:pb-24 pb-20"
    >
      <slot />
    </UMain>

    <UFooter class="w-full shadow z-30 px-0 py-0 sticky bottom-0">
      <PlayerBar />
    </UFooter>
  </UContainer>
</template>
<script setup lang="ts">
</script>
