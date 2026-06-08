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
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-xl font-bold">推荐歌曲</h2>
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-dices"
            size="sm"
            variant="ghost"
            :loading="randomLoading"
            @click="playRandomSongs"
          >
            随机
          </UButton>
          <UButton
            icon="i-lucide-refresh-cw"
            size="sm"
            variant="ghost"
            :loading="songsLoading"
            @click="reloadSongs"
          >
            换一批
          </UButton>
        </div>
      </div>

      <UCard class="card-surface border-theme">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <UInput
            v-model="filterArtist"
            size="sm"
            icon="i-lucide-mic-2"
            placeholder="只听某个歌手"
            @keyup.enter="reloadSongs"
          />
          <UInput
            v-model="filterAlbum"
            size="sm"
            icon="i-lucide-disc-3"
            placeholder="只听某张专辑"
            @keyup.enter="reloadSongs"
          />
          <UInput
            v-model="excludeArtist"
            size="sm"
            icon="i-lucide-user-x"
            placeholder="排除歌手"
            @keyup.enter="reloadSongs"
          />
          <UInput
            v-model="excludeAlbum"
            size="sm"
            icon="i-lucide-circle-slash-2"
            placeholder="排除专辑"
            @keyup.enter="reloadSongs"
          />
        </div>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
          <UCheckbox v-model="lightMode" label="轻量加载" />
          <UButton
            v-if="hasFilters"
            icon="i-lucide-x"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="clearFilters"
          >
            清空筛选
          </UButton>
        </div>
      </UCard>

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
import { onMounted, computed, ref } from 'vue'
import { useSongsStore } from '@/stores/songs'
import { useRouter } from 'vue-router'
import type { SongSearchFilters } from '@/types'

const songsStore = useSongsStore()
const router = useRouter()

// 使用 computed 从 store 获取状态
const songsLoading = computed(() => songsStore.homeLoading)
const songs = computed(() => songsStore.songs)
const artists = computed(() => songsStore.artists)
const albums = computed(() => songsStore.albums)
const currentPlaylistId = computed(() => songsStore.currentPlaylistId)
const filterArtist = ref('')
const filterAlbum = ref('')
const excludeArtist = ref('')
const excludeAlbum = ref('')
const lightMode = ref(true)
const randomLoading = ref(false)

const activeFilters = computed<SongSearchFilters>(() => ({
  artist: filterArtist.value.trim() || undefined,
  album: filterAlbum.value.trim() || undefined,
  excludeArtist: excludeArtist.value.trim() || undefined,
  excludeAlbum: excludeAlbum.value.trim() || undefined,
  includeAssets: !lightMode.value
}))

const hasFilters = computed(
  () =>
    Boolean(
      activeFilters.value.artist ||
        activeFilters.value.album ||
        activeFilters.value.excludeArtist ||
        activeFilters.value.excludeAlbum
    ) || !lightMode.value
)

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
  const artistSongs = await songsStore.searchSongs('', false, undefined, artistName, undefined, undefined, {
    includeAssets: false
  })
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
  const albumSongs = await songsStore.searchSongs('', false, albumName, undefined, undefined, undefined, {
    includeAssets: false
  })
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

const playRandomSongs = async () => {
  randomLoading.value = true
  try {
    const result = await songsStore.searchSongs('', true, undefined, undefined, 24, undefined, activeFilters.value)
    if (result.length > 0) {
      songsStore.setPlaylist('random-filtered', '随机发现', result)
      songsStore.playSong(0)
    }
  } finally {
    randomLoading.value = false
  }
}

const clearFilters = async () => {
  filterArtist.value = ''
  filterAlbum.value = ''
  excludeArtist.value = ''
  excludeAlbum.value = ''
  lightMode.value = true
  await reloadSongs()
}

/**
 * 加载首页所有数据
 */
const loadHomeData = async () => {
  await songsStore.fetchHomeData(activeFilters.value)
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
