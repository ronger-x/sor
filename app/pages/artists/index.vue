<template>
  <div class="container mx-auto">
    <div class="mb-6">
      <h1 class="text-3xl font-bold">歌手</h1>
      <p class="text-gray-500 mt-2">浏览所有歌手</p>
    </div>

    <!-- 搜索框 -->
    <div class="mb-6">
      <UInput
        v-model="searchQuery"
        size="lg"
        placeholder="搜索歌手..."
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
    <div v-if="loading && !artists.length" class="flex items-center justify-center h-64">
      <div class="text-center">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl mb-2" />
        <p class="text-sm text-gray-500">加载歌手中...</p>
      </div>
    </div>

    <!-- 歌手网格 -->
    <div v-else-if="artists && artists.length" class="space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <UCard
          v-for="artist in artists"
          :key="artist.artist"
          class="card-surface border-theme cursor-pointer transition hover:scale-105"
          @click="handleArtistClick(artist)"
        >
          <div class="flex flex-col items-center text-center">
            <NuxtImg
              :src="artist.cover || '/default-avatar.png'"
              :alt="artist.artist"
              width="150"
              height="150"
              loading="lazy"
              class="w-full aspect-square object-cover rounded-full mb-3"
            />
            <div class="font-bold text-sm line-clamp-2 w-full">{{ artist.artist }}</div>
            <div class="text-xs text-gray-500 mt-1">{{ artist.count || 0 }} 首歌曲</div>
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
        <p v-else class="text-sm text-gray-500">没有更多歌手了</p>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else>
      <UEmpty icon="i-lucide-mic" title="没有找到歌手">
        <template #actions>
          <UButton icon="i-lucide-refresh-cw" subtle @click="loadArtists">刷新</UButton>
        </template>
      </UEmpty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSongsStore } from '@/stores/songs'
import { useRouter } from 'vue-router'
import type { Artist } from '@/types'

const songsStore = useSongsStore()
const router = useRouter()

const searchQuery = ref('')
const artists = computed(() => songsStore.allArtists)
const loading = computed(() => songsStore.artistsLoading)
const hasMore = computed(() => songsStore.artistsHasMore)

/**
 * 加载歌手列表
 */
async function loadArtists() {
  await songsStore.loadAllArtists(true, searchQuery.value)
}

/**
 * 加载更多歌手
 */
async function loadMore() {
  await songsStore.loadAllArtists(false)
}

/**
 * 搜索处理
 */
async function handleSearch() {
  await loadArtists()
}

/**
 * 清除搜索
 */
async function clearSearch() {
  searchQuery.value = ''
  await loadArtists()
}

/**
 * 点击歌手，使用歌手名称和count作为查询参数
 */
async function handleArtistClick(artist: Artist) {
  const songs = await songsStore.searchSongs(
    '',
    false,
    undefined,
    artist.artist,
    artist.count || 50
  )
  if (songs.length > 0) {
    songsStore.setPlaylist(`artist-${artist.artist}`, artist.artist, songs)
    // 播放第一首
    songsStore.playSong(0)
    router.push('/')
  }
}

onMounted(() => {
  // 总是加载全部歌手数据，而不是使用首页数据
  loadArtists()
})
</script>

<style scoped>
.container {
  max-width: 1200px;
}
</style>
