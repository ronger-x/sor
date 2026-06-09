<template>
  <UContainer class="min-h-screen flex flex-col">
    <UHeader class="sticky top-0 z-20 backdrop-blur">
      <template #title>
        <span
          v-if="$device.isDesktop"
          class="text-2xl font-bold tracking-wide text-primary font-edix"
          >S.O.R Music</span
        >
        <span v-else class="text-xl font-bold tracking-wide text-primary font-edix"
          >S.O.R Music</span
        >
      </template>

      <!-- 桌面端导航菜单 -->
      <UNavigationMenu :items="navItems" class="hidden lg:flex" />

      <template #right>
        <SongSearch />
        <UColorModeButton />
        <UButton
          icon="i-lucide-github"
          color="neutral"
          variant="ghost"
          to="https://github.com/ronger-x/sor"
          target="_blank"
          aria-label="GitHub"
        />
      </template>

      <!-- 移动端菜单 -->
      <template #body>
        <UNavigationMenu :items="navItems" orientation="vertical" class="-mx-2.5" />
      </template>
    </UHeader>

    <UMain
      class="flex-1 flex flex-col w-full mx-auto items-center justify-start px-2 py-6 md:pb-24 pb-20"
    >
      <slot />
    </UMain>

    <UFooter class="w-full shadow z-30 px-0 py-0 sticky bottom-0">
      <PlayerBar />
    </UFooter>

    <LyricOverlay />
  </UContainer>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const navItems = computed<NavigationMenuItem[]>(() => [
  {
    label: '首页',
    to: '/',
    active: route.path === '/'
  },
  {
    label: '歌手',
    to: '/artists',
    active: route.path === '/artists'
  },
  {
    label: '专辑',
    to: '/albums',
    active: route.path === '/albums'
  },
  {
    label: '歌单',
    to: '/playlists',
    active: route.path === '/playlists'
  },
  {
    label: '播放空间',
    to: '/listen',
    active: route.path === '/listen'
  },
  {
    label: '云曲库',
    to: '/library',
    active: route.path === '/library'
  },
  {
    label: '专题',
    to: '/podcasts',
    active: route.path === '/podcasts'
  },
  {
    label: '视觉',
    to: '/visuals',
    active: route.path === '/visuals'
  }
])
</script>
