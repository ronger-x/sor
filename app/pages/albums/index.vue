<template>
  <div class="container mx-auto">
    <div class="mb-6">
      <h1 class="text-3xl font-bold">专辑</h1>
      <p class="text-gray-500 mt-2">浏览所有专辑</p>
    </div>

    <!-- 搜索框 -->
    <div class="mb-6">
      <UInput
        v-model="searchQuery"
        size="lg"
        placeholder="搜索歌手以筛选专辑..."
        icon="i-lucide-search"
        :trailing="false"
        @keyup.enter="handleSearch"
      >
        <template #trailing>
          <UButton
            v-if="searchQuery"
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            @click="clearSearch"
          />
        </template>
      </UInput>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && !albums.length" class="flex items-center justify-center h-64">
      <div class="text-center">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl mb-2" />
        <p class="text-sm text-gray-500">加载专辑中...</p>
      </div>
    </div>

    <!-- 专辑网格 -->
    <div v-else-if="albums && albums.length" class="space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <UCard
          v-for="album in albums"
          :key="album.album"
          class="card-surface border-theme cursor-pointer transition hover:scale-105"
          @click="handleAlbumClick(album)"
        >
          <div class="flex flex-col items-center text-center">
            <NuxtImg
              :src="album.cover || '/default-album.png'"
              :alt="album.album"
              width="150"
              height="150"
              loading="lazy"
              class="w-full aspect-square object-cover rounded mb-3"
            />
            <div class="font-bold text-sm line-clamp-2 w-full">{{ album.album }}</div>
            <div class="text-xs text-gray-500 mt-1">{{ album.count || 0 }} 首歌曲</div>
          </div>
        </UCard>
      </div>

      <!-- 加载更多按钮 -->
      <div v-if="hasMore || loading" class="flex justify-center py-8">
        <UButton v-if="hasMore && !loading" size="lg" variant="outline" @click="loadMore">
          加载更多
        </UButton>
        <div v-else-if="loading" class="text-center">
          <UIcon name="i-lucide-loader-2" class="animate-spin text-2xl" />
        </div>
        <p v-else class="text-sm text-gray-500">没有更多专辑了</p>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else>
      <UEmpty icon="i-lucide-disc-album" title="没有找到专辑">
        <template #actions>
          <UButton icon="i-lucide-refresh-cw" subtle @click="loadAlbums">刷新</UButton>
        </template>
      </UEmpty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSongsStore } from '@/stores/songs'
import type { Album } from '@/types'

const songsStore = useSongsStore()

const searchQuery = ref('')
const albums = computed(() => songsStore.allAlbums)
const loading = computed(() => songsStore.albumsLoading)
const hasMore = computed(() => songsStore.albumsHasMore)

/**
 * 加载专辑列表
 */
async function loadAlbums() {
  await songsStore.loadAllAlbums(true, searchQuery.value)
}

/**
 * 加载更多专辑
 */
async function loadMore() {
  await songsStore.loadAllAlbums(false)
}

/**
 * 搜索处理
 */
async function handleSearch() {
  await loadAlbums()
}

/**
 * 清除搜索
 */
async function clearSearch() {
  searchQuery.value = ''
  await loadAlbums()
}

/**
 * 点击专辑，使用专辑名称和count作为查询参数
 */
async function handleAlbumClick(album: Album) {
  const songs = await songsStore.searchSongs('', false, album.album, undefined, album.count || 50)
  if (songs.length > 0) {
    songsStore.setPlaylist(`album-${album.album}`, album.album, songs)
    // 播放第一首
    songsStore.playSong(0)
  }
}

onMounted(() => {
  // 总是加载全部专辑数据，而不是使用首页数据
  loadAlbums()
})
</script>

<style scoped>
.container {
  max-width: 1200px;
}
</style>
