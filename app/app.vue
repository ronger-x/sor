<script lang="ts" setup>
import { onBeforeUnmount, computed } from 'vue'
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

const description = 'A modern music player built with Nuxt'

// 使用 useSeoMeta 统一管理所有 SEO 相关的 meta 标签
useSeoMeta({
  title: pageTitle,
  description,
  ogTitle: pageTitle,
  ogDescription: description,
  ogImage: () => songsStore.currentSong?.cover || '/favicon.ico',
  ogType: 'music.song',
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: description,
  twitterImage: () => songsStore.currentSong?.cover || '/favicon.ico'
})

// 仅使用 useHead 处理非 SEO 相关的 head 内容
useHead({
  htmlAttrs: {
    lang: 'zh-CN'
  },
  link: [{ rel: 'icon', href: '/favicon.ico' }]
})
</script>
<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
