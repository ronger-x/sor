<script lang="ts" setup>
import { onBeforeUnmount } from 'vue'
import { useSongsStore } from '@/stores/songs'

const songsStore = useSongsStore()

// 应用卸载时清理所有资源
onBeforeUnmount(() => {
  songsStore.dispose()
})

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'S.O.R Music'
const description = 'a music player'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description
})
</script>
<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
