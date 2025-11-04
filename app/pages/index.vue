<template>
  <div class="container mx-auto space-y-8">
    <!-- 歌手轮播 -->
    <div v-if="artists && artists.length" class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">推荐歌手</h2>
        <UButton variant="ghost" size="sm" trailing-icon="i-lucide-arrow-right" to="/artists">
          查看全部
        </UButton>
      </div>
      <UMarquee
        pause-on-hover
        :repeat="4"
        :ui="{ root: '[--duration:30s] [--gap:--spacing(3)]', content: 'w-auto' }"
      >
        <UCard
          v-for="item in artists"
          :key="item.artist"
          class="card-surface border-theme cursor-pointer transition hover:scale-105 shrink-0"
          @click="handleArtistClick(item.artist)"
        >
          <div class="flex flex-col items-center text-center w-32">
            <NuxtImg
              :src="item.cover || '/default-avatar.png'"
              :alt="item.artist"
              width="100"
              height="100"
              loading="lazy"
              class="w-24 h-24 object-cover rounded-full mb-2"
            />
            <div class="font-bold text-sm line-clamp-1 w-full">{{ item.artist }}</div>
            <div class="text-xs text-gray-500">{{ item.count || 0 }} 首</div>
          </div>
        </UCard>
      </UMarquee>
    </div>

    <!-- 专辑轮播 -->
    <div v-if="albums && albums.length" class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">推荐专辑</h2>
        <UButton variant="ghost" size="sm" trailing-icon="i-lucide-arrow-right" to="/albums">
          查看全部
        </UButton>
      </div>
      <UMarquee
        pause-on-hover
        reverse
        :repeat="4"
        :ui="{ root: '[--duration:35s] [--gap:--spacing(3)]', content: 'w-auto' }"
      >
        <UCard
          v-for="item in albums"
          :key="item.album"
          class="card-surface border-theme cursor-pointer transition hover:scale-105 shrink-0"
          @click="handleAlbumClick(item.album)"
        >
          <div class="flex flex-col items-center text-center w-32">
            <NuxtImg
              :src="item.cover || '/default-album.png'"
              :alt="item.album"
              width="100"
              height="100"
              loading="lazy"
              class="w-24 h-24 object-cover rounded mb-2"
            />
            <div class="font-bold text-sm line-clamp-1 w-full">{{ item.album }}</div>
            <div class="text-xs text-gray-500">{{ item.count || 0 }} 首</div>
          </div>
        </UCard>
      </UMarquee>
    </div>

    <!-- 歌曲列表 -->
    <div v-if="songs && songs.length" class="relative space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">推荐歌曲</h2>
        <UButton icon="i-lucide-refresh-cw" size="sm" variant="ghost" @click="reloadSongs">
          换一批
        </UButton>
      </div>

      <!-- 加载状态 -->
      <div v-if="songsLoading" class="flex items-center justify-center h-64">
        <div class="text-center">
          <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl mb-2" />
          <p class="text-sm text-gray-500">加载歌曲中...</p>
        </div>
      </div>

      <!-- Grid of song cards -->
      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UCard
          v-for="(song, idx) in songs"
          :key="song.url"
          :class="['card-surface', 'border-theme', cardClasses]"
          @click="playSong(idx)"
        >
          <NuxtImg
            :src="song.cover"
            :alt="song.name"
            width="128"
            height="128"
            loading="lazy"
            class="w-32 h-32 object-cover rounded mb-4 mx-auto"
          />
          <div class="font-bold text-lg w-full">{{ song.name }}</div>
          <div>{{ song.artist }}</div>
        </UCard>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else>
      <UEmpty icon="i-lucide-music" title="没有找到相关歌曲">
        <template #actions>
          <UButton icon="i-lucide-refresh-cw" subtle @click="loadHomeData"> 刷新歌曲列表 </UButton>
        </template>
      </UEmpty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useSongsStore } from '@/stores/songs'
import { useRouter } from 'vue-router'

const songsStore = useSongsStore()
const router = useRouter()

// 使用 computed 从 store 获取状态
const songsLoading = computed(() => songsStore.homeLoading)
const songs = computed(() => songsStore.songs)
const artists = computed(() => songsStore.artists)
const albums = computed(() => songsStore.albums)
const currentPlaylistId = computed(() => songsStore.currentPlaylistId)

/**
 * 播放指定索引的歌曲
 */
const playSong = (idx: number) => {
  // 首页点击歌曲时，总是将首页推荐歌曲设置为播放列表
  // 这样可以确保从歌手/专辑页面返回后，点击首页歌曲时切换到首页歌单
  songsStore.setPlaylist('home-recommendations', '推荐歌曲', songs.value)
  // 然后播放歌曲
  songsStore.playSong(idx)
}

/**
 * 点击歌手，搜索该歌手的歌曲并跳转首页
 */
async function handleArtistClick(artistName: string) {
  const artistSongs = await songsStore.searchSongs('', false, undefined, artistName)
  if (artistSongs.length > 0) {
    songsStore.setPlaylist(`artist-${artistName}`, artistName, artistSongs)
    // 播放第一首
    songsStore.playSong(0)
  }
}

/**
 * 点击专辑，搜索该专辑的歌曲并跳转首页
 */
async function handleAlbumClick(albumName: string) {
  const albumSongs = await songsStore.searchSongs('', false, albumName)
  if (albumSongs.length > 0) {
    songsStore.setPlaylist(`album-${albumName}`, albumName, albumSongs)
    // 播放第一首
    songsStore.playSong(0)
  }
}

/**
 * 重新加载歌曲列表（换一批）
 */
const reloadSongs = async () => {
  // 只重新加载首页数据，不影响当前播放的歌单
  await loadHomeData()
}

/**
 * 加载首页所有数据
 */
const loadHomeData = async () => {
  await songsStore.fetchHomeData()
}

const cardClasses = computed(() =>
  [
    'flex',
    'flex-col',
    'items-center',
    'justify-center',
    'cursor-pointer',
    'transition',
    'text-center'
  ].join(' ')
)

/**
 * 组件挂载时加载数据
 */
onMounted(async () => {
  // 如果没有数据，则加载
  if (!songs.value.length || !artists.value.length || !albums.value.length) {
    await loadHomeData()
  }
})
</script>

<style scoped>
.container {
  max-width: 900px;
}
.grid > * {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
