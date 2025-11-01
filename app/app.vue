<script lang="ts" setup>
import { onBeforeUnmount, computed, watch } from 'vue'
import { useSongsStore } from '@/stores/songs'

const songsStore = useSongsStore()

// 应用卸载时清理所有资源
onBeforeUnmount(() => {
  songsStore.dispose()
})

// 根据当前播放歌曲动态设置标题
const pageTitle = computed(() => {
  const currentSong = songsStore.currentSong
  if (currentSong) {
    return `${currentSong.name} - ${currentSong.artist} | S.O.R Music`
  }
  return 'S.O.R Music'
})

const description = 'a music player'

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'en'
  },
  title: pageTitle
})

// 同时更新 SEO meta 标签
watch(
  pageTitle,
  newTitle => {
    useSeoMeta({
      title: newTitle,
      description,
      ogTitle: newTitle,
      ogDescription: description
    })
  },
  { immediate: true }
)
</script>
<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
