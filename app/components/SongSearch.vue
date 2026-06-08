<template>
  <UModal v-model:open="isOpen" title="搜索歌曲" description="搜索歌曲">
    <UButton icon="i-lucide-search" color="neutral" variant="ghost" aria-label="搜索歌曲" />

    <template #content>
      <div class="space-y-3 p-3">
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <UInput
            v-model="filterArtist"
            size="sm"
            icon="i-lucide-mic-2"
            placeholder="指定歌手"
          />
          <UInput
            v-model="filterAlbum"
            size="sm"
            icon="i-lucide-disc-3"
            placeholder="指定专辑"
          />
          <UInput
            v-model="excludeArtist"
            size="sm"
            icon="i-lucide-user-x"
            placeholder="排除歌手"
          />
          <UInput
            v-model="excludeAlbum"
            size="sm"
            icon="i-lucide-circle-slash-2"
            placeholder="排除专辑"
          />
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <USwitch v-model="fastListMode" size="sm" />
            <span class="text-xs text-muted">快速列表模式</span>
          </div>
          <UButton
            v-if="hasFilters || fastListMode"
            icon="i-lucide-rotate-ccw"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="clearFilters"
          >
            重置
          </UButton>
        </div>

        <UCommandPalette
          v-model:search-term="searchTerm"
          :groups="songGroups"
          :loading="searchLoading"
          placeholder="搜索歌曲名、歌手或专辑..."
          class="h-96"
          @update:model-value="handleSongSelect"
        >
          <template #item-leading="{ item }">
            <img
              v-if="item.cover"
              :src="item.cover"
              :alt="item.name"
              width="40"
              height="40"
              loading="lazy"
              class="size-10 rounded object-cover"
            />
            <div v-else class="size-10 rounded bg-muted flex items-center justify-center">
              <UIcon name="i-lucide-music" class="size-5 text-dimmed" />
            </div>
          </template>
          <template #item-trailing="{ item }">
            <div class="flex items-center gap-1">
              <UButton
                :icon="isSongLiked(item.song) ? 'i-lucide-heart-off' : 'i-lucide-heart'"
                size="xs"
                variant="ghost"
                :color="isSongLiked(item.song) ? 'error' : 'neutral'"
                :aria-label="isSongLiked(item.song) ? '取消喜欢' : '喜欢歌曲'"
                @click.stop="toggleLikedSong(item.song)"
              />
              <UButton
                icon="i-lucide-ban"
                size="xs"
                variant="ghost"
                color="neutral"
                aria-label="不想听这首"
                @click.stop="blockSong(item.song)"
              />
            </div>
          </template>

          <template #empty="{ searchTerm }">
            <div class="flex flex-col items-center justify-center gap-3 py-8">
              <UIcon name="i-lucide-music" class="size-12 text-muted" />
              <div class="text-center">
                <p class="text-sm font-medium text-highlighted">
                  {{ searchTerm ? '没有找到歌曲' : '开始搜索歌曲' }}
                </p>
                <p class="text-sm text-muted mt-1">
                  {{ searchTerm ? '尝试输入其他关键词或放宽筛选' : '输入歌曲名、歌手或专辑名称' }}
                </p>
              </div>
            </div>
          </template>
        </UCommandPalette>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSongsStore } from '@/stores/songs'
import { useMusicPreferencesStore } from '@/stores/preferences'
import type { Song, SongSearchFilters } from '@/types'

const songsStore = useSongsStore()
const preferencesStore = useMusicPreferencesStore()

// 组件状态
const isOpen = ref(false)
const searchTerm = ref('')
const searchSongs = ref<Song[]>([])
const searchLoading = ref(false)
const filterArtist = ref('')
const filterAlbum = ref('')
const excludeArtist = ref('')
const excludeAlbum = ref('')
const fastListMode = ref(false)

// Store 状态
const currentPlaylistId = computed(() => songsStore.currentPlaylistId)
const lyricsModal = computed(() => songsStore.lyricsModal)
const activeFilters = computed<SongSearchFilters>(() => ({
  artist: filterArtist.value.trim() || undefined,
  album: filterAlbum.value.trim() || undefined,
  excludeArtist: excludeArtist.value.trim() || undefined,
  excludeAlbum: excludeAlbum.value.trim() || undefined,
  includeAssets: !fastListMode.value
}))
const hasFilters = computed(() =>
  Boolean(
    activeFilters.value.artist ||
      activeFilters.value.album ||
      activeFilters.value.excludeArtist ||
      activeFilters.value.excludeAlbum
  )
)

// 将歌曲转换为 CommandPalette 所需的格式
const songGroups = computed(() => {
  if (!searchTerm.value) {
    return []
  }

  const items = searchSongs.value.map((song: Song) => ({
    id: song.url,
    label: song.name,
    suffix: [song.artist, song.album].filter(Boolean).join(' · '),
    icon: 'i-lucide-music',
    cover: song.cover,
    name: song.name,
    artist: song.artist,
    url: song.url,
    lrc: song.lrc,
    song,
    onSelect: () => handleSongSelect(song)
  }))

  return [
    {
      id: 'songs',
      label: searchTerm.value ? `搜索 "${searchTerm.value}" 的结果` : '歌曲',
      items,
      ignoreFilter: true
    }
  ]
})

/**
 * 监听搜索词变化，自动触发搜索
 */
const runSearch = async () => {
  if (!searchTerm.value) {
    searchSongs.value = []
    return
  }

  searchLoading.value = true
  try {
    searchSongs.value = await songsStore.searchSongs(
      searchTerm.value,
      false,
      undefined,
      undefined,
      50,
      undefined,
      activeFilters.value
    )
  } finally {
    searchLoading.value = false
  }
}

watch(searchTerm, runSearch)
watch([filterArtist, filterAlbum, excludeArtist, excludeAlbum, fastListMode], runSearch)

const clearFilters = () => {
  filterArtist.value = ''
  filterAlbum.value = ''
  excludeArtist.value = ''
  excludeAlbum.value = ''
  fastListMode.value = false
}

const isSongLiked = (song: Song) => preferencesStore.isSongLiked(song)

const toggleLikedSong = (song: Song) => {
  preferencesStore.toggleLikedSong(song)
}

const blockSong = async (song: Song) => {
  preferencesStore.blockSong(song)
  await runSearch()
}

/**
 * 处理歌曲选择
 */
const handleSongSelect = async (song: any) => {
  // 关闭弹窗
  isOpen.value = false

  // 如果在歌词页面，返回首页
  if (lyricsModal.value) {
    songsStore.closeLyricsPanel()
  }

  // 播放选中的歌曲
  if (song && song.url) {
    const songIndex = searchSongs.value.findIndex(s => s.url === song.url)
    if (!currentPlaylistId.value || currentPlaylistId.value === 'default') {
      songsStore.setPlaylist('default', '当前播放', searchSongs.value)
    }
    // 然后播放歌曲
    songsStore.playSong(songIndex)
  }

  // 清空搜索词
  searchTerm.value = ''
}

/**
 * 监听弹窗关闭，清空搜索词
 */
watch(isOpen, newValue => {
  if (!newValue) {
    searchTerm.value = ''
  }
})
</script>
