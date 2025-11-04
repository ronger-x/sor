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
      :class="[
        'flex-1 flex flex-col w-full mx-auto',
        route.path === '/lyric' ? 'p-0' : 'items-center justify-start px-2 py-6 md:pb-24 pb-20'
      ]"
    >
      <slot />
    </UMain>

    <UFooter class="w-full shadow z-30 px-0 py-0 sticky bottom-0">
      <PlayerBar />
    </UFooter>
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
  }
])
</script>
