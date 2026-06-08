<template>
  <div class="container mx-auto space-y-8">
    <!-- 发现控制台 -->
    <UCard class="card-surface border-theme discovery-panel">
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge color="primary" variant="soft" icon="i-lucide-sparkles">
                随机发现
              </UBadge>
              <UBadge v-if="hasFilters" color="neutral" variant="soft">
                已筛选
              </UBadge>
            </div>
            <h1 class="mt-3 text-2xl font-bold md:text-3xl">按你的曲库口味开播</h1>
            <p class="mt-2 text-sm text-muted">
              把歌手、专辑、排除条件组合成一次随机歌单。
            </p>
          </div>
          <div class="flex shrink-0 flex-wrap gap-2">
            <UButton
              icon="i-lucide-dices"
              color="primary"
              :loading="randomLoading"
              @click="playRandomSongs"
            >
              随机开播
            </UButton>
            <UButton
              icon="i-lucide-refresh-cw"
              variant="outline"
              :loading="songsLoading"
              @click="reloadSongs"
            >
              换一批
            </UButton>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div class="space-y-2">
            <UInput
              v-model="filterArtist"
              icon="i-lucide-mic-2"
              placeholder="选择或输入歌手"
              @input="searchArtistOptions"
              @keyup.enter="reloadSongs"
            >
              <template #trailing>
                <UButton
                  v-if="filterArtist"
                  icon="i-lucide-x"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  aria-label="清空歌手"
                  @click="filterArtist = ''"
                />
              </template>
            </UInput>
            <div v-if="artistOptions.length" class="filter-options">
              <UButton
                v-for="artist in artistOptions"
                :key="`artist-option-${artist.artist}`"
                size="xs"
                variant="soft"
                color="neutral"
                icon="i-lucide-mic-2"
                @click="applyArtist(artist.artist)"
              >
                {{ artist.artist }}
              </UButton>
            </div>
          </div>
          <div class="space-y-2">
            <UInput
              v-model="filterAlbum"
              icon="i-lucide-disc-3"
              placeholder="选择或输入专辑"
              @input="searchAlbumOptions"
              @keyup.enter="reloadSongs"
            >
              <template #trailing>
                <UButton
                  v-if="filterAlbum"
                  icon="i-lucide-x"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  aria-label="清空专辑"
                  @click="filterAlbum = ''"
                />
              </template>
            </UInput>
            <div v-if="albumOptions.length" class="filter-options">
              <UButton
                v-for="album in albumOptions"
                :key="`album-option-${album.album}`"
                size="xs"
                variant="soft"
                color="neutral"
                icon="i-lucide-disc-3"
                @click="applyAlbum(album.album)"
              >
                {{ album.album }}
              </UButton>
            </div>
          </div>
          <UInput
            v-model="excludeArtist"
            icon="i-lucide-user-x"
            placeholder="排除歌手"
            @keyup.enter="reloadSongs"
          >
            <template #trailing>
              <UButton
                v-if="excludeArtist"
                icon="i-lucide-x"
                size="xs"
                color="neutral"
                variant="ghost"
                aria-label="清空排除歌手"
                @click="excludeArtist = ''"
              />
            </template>
          </UInput>
          <UInput
            v-model="excludeAlbum"
            icon="i-lucide-circle-slash-2"
            placeholder="排除专辑"
            @keyup.enter="reloadSongs"
          >
            <template #trailing>
              <UButton
                v-if="excludeAlbum"
                icon="i-lucide-x"
                size="xs"
                color="neutral"
                variant="ghost"
                aria-label="清空排除专辑"
                @click="excludeAlbum = ''"
              />
            </template>
          </UInput>
        </div>

        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="artist in artistQuickFilters"
              :key="artist.artist"
              size="xs"
              variant="soft"
              color="neutral"
              icon="i-lucide-mic-2"
              @click="applyArtist(artist.artist)"
            >
              {{ artist.artist }}
            </UButton>
            <UButton
              v-for="album in albumQuickFilters"
              :key="album.album"
              size="xs"
              variant="soft"
              color="neutral"
              icon="i-lucide-disc-3"
              @click="applyAlbum(album.album)"
            >
              {{ album.album }}
            </UButton>
          </div>
          <div class="flex items-center gap-3">
            <USwitch v-model="fastListMode" size="sm" />
            <span class="text-xs text-muted">快速列表模式</span>
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
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UButton
            icon="i-lucide-cloud-download"
            size="xs"
            variant="soft"
            :loading="preferencesStore.syncLoading"
            @click="preferencesStore.pullCloudPreferences"
          >
            拉取同步
          </UButton>
          <UButton
            icon="i-lucide-cloud-upload"
            size="xs"
            variant="soft"
            :loading="preferencesStore.syncLoading"
            @click="preferencesStore.pushCloudPreferences"
          >
            保存同步
          </UButton>
          <UButton icon="i-lucide-list-plus" size="xs" variant="soft" @click="saveCurrentAsPlaylist">
            存成歌单
          </UButton>
          <UButton icon="i-lucide-panel-top-open" size="xs" variant="soft" to="/listen">
            播放空间
          </UButton>
          <UButton icon="i-lucide-upload-cloud" size="xs" variant="soft" to="/library">
            上传曲库
          </UButton>
          <span class="text-xs text-muted">同步 ID：{{ preferencesStore.profileId }}</span>
        </div>

        <div
          v-if="likedSongs.length || recentSongs.length || hasBlockedContent"
          class="grid grid-cols-1 gap-3 md:grid-cols-3"
        >
          <UCard v-if="likedSongs.length" class="preference-card border-theme">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="text-sm font-semibold">我喜欢</div>
                <div class="text-xs text-muted">{{ likedSongs.length }} 首</div>
              </div>
              <UButton
                icon="i-lucide-play"
                size="xs"
                variant="soft"
                color="primary"
                @click="playLikedSongs"
              >
                播放
              </UButton>
            </div>
            <div class="mt-3 space-y-2">
              <button
                v-for="song in likedSongsPreview"
                :key="`liked-${song.id}-${song.url}`"
                class="preference-row"
                type="button"
                @click="playSongList(likedSongs, song, 'liked-songs', '我喜欢')"
              >
                <span class="truncate">{{ song.name }}</span>
                <span class="truncate text-muted">{{ song.artist }}</span>
              </button>
            </div>
          </UCard>

          <UCard v-if="recentSongs.length" class="preference-card border-theme">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="text-sm font-semibold">最近播放</div>
                <div class="text-xs text-muted">{{ recentSongs.length }} 首</div>
              </div>
              <UButton
                icon="i-lucide-trash-2"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="preferencesStore.clearRecentSongs"
              />
            </div>
            <div class="mt-3 space-y-2">
              <button
                v-for="song in recentSongsPreview"
                :key="`recent-${song.id}-${song.url}`"
                class="preference-row"
                type="button"
                @click="playSongList(recentSongs, song, 'recent-songs', '最近播放')"
              >
                <span class="truncate">{{ song.name }}</span>
                <span class="truncate text-muted">{{ song.artist }}</span>
              </button>
            </div>
          </UCard>

          <UCard v-if="hasBlockedContent" class="preference-card border-theme">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="text-sm font-semibold">不想听</div>
                <div class="text-xs text-muted">
                  {{ blockedSongs.length }} 首 / {{ blockedArtists.length }} 位歌手 /
                  {{ blockedAlbums.length }} 张专辑
                </div>
              </div>
              <UButton
                icon="i-lucide-rotate-ccw"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="clearBlockedContent"
              />
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <UBadge
                v-for="artist in blockedArtistsPreview"
                :key="`blocked-artist-${artist}`"
                color="neutral"
                variant="soft"
                class="cursor-pointer"
                @click="unblockArtist(artist)"
              >
                {{ artist }}
              </UBadge>
              <UBadge
                v-for="album in blockedAlbumsPreview"
                :key="`blocked-album-${album}`"
                color="neutral"
                variant="soft"
                class="cursor-pointer"
                @click="unblockAlbum(album)"
              >
                {{ album }}
              </UBadge>
              <UBadge
                v-for="song in blockedSongsPreview"
                :key="`blocked-song-${song.id}-${song.url}`"
                color="neutral"
                variant="soft"
                class="cursor-pointer"
                @click="unblockSong(song)"
              >
                {{ song.name }}
              </UBadge>
            </div>
          </UCard>
        </div>
      </div>
    </UCard>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <UCard class="card-surface border-theme">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h2 class="text-lg font-bold">每日推荐</h2>
            <p class="text-xs text-muted">按喜欢和最近播放生成</p>
          </div>
          <UButton icon="i-lucide-refresh-cw" size="xs" variant="ghost" @click="loadAppFeatures" />
        </div>
        <div class="mt-3 space-y-2">
          <button
            v-for="song in dailySongsPreview"
            :key="`daily-${song.id}-${song.url}`"
            class="preference-row"
            type="button"
            @click="playSongList(dailySongs, song, 'daily-recommend', '每日推荐')"
          >
            <span class="truncate">{{ song.name }}</span>
            <span class="truncate text-muted">{{ song.artist }}</span>
          </button>
        </div>
      </UCard>

      <UCard class="card-surface border-theme">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h2 class="text-lg font-bold">榜单</h2>
            <p class="text-xs text-muted">热播 / 新歌 / 收藏</p>
          </div>
          <div class="flex gap-1">
            <UButton size="xs" variant="soft" @click="loadChart('hot')">热播</UButton>
            <UButton size="xs" variant="soft" @click="loadChart('new')">新歌</UButton>
          </div>
        </div>
        <div class="mt-3 space-y-2">
          <button
            v-for="song in chartSongsPreview"
            :key="`chart-${song.id}-${song.url}`"
            class="preference-row"
            type="button"
            @click="playSongList(chartSongs, song, `chart-${activeChart}`, chartTitle)"
          >
            <span class="truncate">{{ song.name }}</span>
            <span class="truncate text-muted">{{ song.artist }}</span>
          </button>
        </div>
      </UCard>

      <UCard class="card-surface border-theme">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h2 class="text-lg font-bold">私人 FM</h2>
            <p class="text-xs text-muted">随机电台和场景频道</p>
          </div>
          <UButton icon="i-lucide-radio" size="xs" variant="soft" @click="playChannelRadio" />
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <UButton
            v-for="channel in channelPreview"
            :key="`${channel.type}-${channel.name}`"
            size="xs"
            variant="soft"
            color="neutral"
            @click="playChannel(channel)"
          >
            {{ channel.name }}
          </UButton>
        </div>
      </UCard>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <UCard class="card-surface border-theme">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold">我的歌单</h2>
          <UButton to="/playlists" size="xs" variant="ghost" trailing-icon="i-lucide-arrow-right">
            管理
          </UButton>
        </div>
        <div class="mt-3 space-y-2">
          <button
            v-for="playlist in playlistPreview"
            :key="`playlist-${playlist.id}`"
            class="preference-row"
            type="button"
            @click="playPlaylist(playlist)"
          >
            <span class="truncate">{{ playlist.name }}</span>
            <span class="truncate text-muted">{{ playlist.songs.length }} 首</span>
          </button>
        </div>
      </UCard>

      <UCard class="card-surface border-theme">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold">视觉歌词</h2>
          <UButton to="/visuals" size="xs" variant="ghost" trailing-icon="i-lucide-arrow-right">
            查看
          </UButton>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <UBadge
            v-for="item in mvPreview"
            :key="`mv-${item.name}`"
            color="neutral"
            variant="soft"
          >
            {{ item.name }}
          </UBadge>
        </div>
      </UCard>

      <UCard class="card-surface border-theme">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold">播客专题</h2>
          <UButton to="/podcasts" size="xs" variant="ghost" trailing-icon="i-lucide-arrow-right">
            查看
          </UButton>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <UBadge
            v-for="item in podcastPreview"
            :key="`podcast-${item.name}`"
            color="neutral"
            variant="soft"
          >
            {{ item.name }}
          </UBadge>
        </div>
      </UCard>
    </div>

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
              :src="item.cover || defaultAvatar"
              :alt="item.artist"
              width="100"
              height="100"
              loading="lazy"
              class="w-24 h-24 object-cover rounded-full mb-2"
            />
            <div class="font-bold text-sm line-clamp-1 w-full">{{ item.artist }}</div>
            <div class="text-xs text-gray-500">{{ Number(item.count || 0) }} 首</div>
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
              :src="item.cover || defaultAlbum"
              :alt="item.album"
              width="100"
              height="100"
              loading="lazy"
              class="w-24 h-24 object-cover rounded mb-2"
            />
            <div class="font-bold text-sm line-clamp-1 w-full">{{ item.album }}</div>
            <div class="text-xs text-gray-500">{{ Number(item.count || 0) }} 首</div>
          </div>
        </UCard>
      </UMarquee>
    </div>

    <!-- 歌曲列表 -->
    <div v-if="songs && songs.length" class="relative space-y-3">
      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-xl font-bold">{{ hasFilters ? '筛选歌曲' : '推荐歌曲' }}</h2>
          <p class="text-xs text-muted">
            {{ playlistHint }}
          </p>
        </div>
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

      <!-- 加载状态 -->
      <div v-if="songsLoading" class="flex items-center justify-center h-64">
        <div class="text-center">
          <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl mb-2" />
          <p class="text-sm text-gray-500">加载歌曲中...</p>
        </div>
      </div>

      <!-- Grid of song cards -->
      <div v-else class="song-grid grid grid-cols-1 md:grid-cols-3 gap-6">
        <UCard
          v-for="(song, idx) in songs"
          :key="song.url"
          :class="['card-surface', 'border-theme', cardClasses]"
          @click="playSong(idx)"
        >
          <div class="absolute right-3 top-3 z-10 flex gap-1">
            <UButton
              :icon="isSongLiked(song) ? 'i-lucide-heart-off' : 'i-lucide-heart'"
              size="xs"
              variant="soft"
              :color="isSongLiked(song) ? 'error' : 'neutral'"
              :aria-label="isSongLiked(song) ? '取消喜欢' : '喜欢歌曲'"
              @click.stop="toggleLikedSong(song)"
            />
            <UButton
              icon="i-lucide-ban"
              size="xs"
              variant="soft"
              color="neutral"
              aria-label="不想听这首"
              @click.stop="blockSong(song)"
            />
            <UButton
              icon="i-lucide-user-x"
              size="xs"
              variant="soft"
              color="neutral"
              aria-label="屏蔽此歌手"
              @click.stop="blockArtist(song.artist)"
            />
            <UButton
              v-if="song.album"
              icon="i-lucide-circle-slash-2"
              size="xs"
              variant="soft"
              color="neutral"
              aria-label="屏蔽此专辑"
              @click.stop="blockAlbum(song.album)"
            />
            <SongShareButton :song="song" size="xs" variant="soft" color="neutral" />
          </div>
          <NuxtImg
            :src="song.cover || defaultAlbum"
            :alt="song.name"
            width="128"
            height="128"
            loading="lazy"
            class="w-32 h-32 object-cover rounded mb-4 mx-auto"
          />
          <div class="font-bold text-lg w-full">{{ song.name }}</div>
          <div>{{ song.artist }}</div>
          <div v-if="song.album" class="mt-1 text-xs text-muted line-clamp-1 w-full">
            {{ song.album }}
          </div>
        </UCard>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="songsLoading" class="flex items-center justify-center h-64">
      <div class="text-center">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl mb-2" />
        <p class="text-sm text-gray-500">加载歌曲中...</p>
      </div>
    </div>

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
import { useMusicPreferencesStore } from '@/stores/preferences'
import { useRouter } from 'vue-router'
import type {
  Album,
  Artist,
  DiscoveryChannel,
  DiscoveryChannels,
  Song,
  SongSearchFilters,
  UserPlaylist
} from '@/types'

const songsStore = useSongsStore()
const preferencesStore = useMusicPreferencesStore()
const router = useRouter()

// 使用 computed 从 store 获取状态
const songsLoading = computed(() => songsStore.homeLoading)
const songs = computed(() => songsStore.songs)
const artists = computed(() => songsStore.artists)
const albums = computed(() => songsStore.albums)
const currentPlaylistId = computed(() => songsStore.currentPlaylistId)
const likedSongs = computed(() => preferencesStore.likedSongs)
const recentSongs = computed(() => preferencesStore.recentSongs)
const blockedSongs = computed(() => preferencesStore.blockedSongs)
const blockedArtists = computed(() => preferencesStore.blockedArtists)
const blockedAlbums = computed(() => preferencesStore.blockedAlbums)
const hasBlockedContent = computed(() => preferencesStore.hasBlockedContent)
const filterArtist = ref('')
const filterAlbum = ref('')
const excludeArtist = ref('')
const excludeAlbum = ref('')
const fastListMode = ref(false)
const randomLoading = ref(false)
const dailySongs = ref<Song[]>([])
const chartSongs = ref<Song[]>([])
const activeChart = ref('hot')
const discoveryChannels = ref<DiscoveryChannels | null>(null)
const artistOptions = ref<Artist[]>([])
const albumOptions = ref<Album[]>([])
const defaultAlbum = '/favicon.ico'
const defaultAvatar = '/favicon.ico'

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

const artistQuickFilters = computed(() => artists.value.slice(0, 4))
const albumQuickFilters = computed(() => albums.value.slice(0, 4))
const likedSongsPreview = computed(() => likedSongs.value.slice(0, 4))
const recentSongsPreview = computed(() => recentSongs.value.slice(0, 4))
const blockedSongsPreview = computed(() => blockedSongs.value.slice(0, 4))
const blockedArtistsPreview = computed(() => blockedArtists.value.slice(0, 4))
const blockedAlbumsPreview = computed(() => blockedAlbums.value.slice(0, 4))
const dailySongsPreview = computed(() => dailySongs.value.slice(0, 4))
const chartSongsPreview = computed(() => chartSongs.value.slice(0, 4))
const chartTitle = computed(() => (activeChart.value === 'new' ? '新歌榜' : '热播榜'))
const channelPreview = computed(() => [
  ...(discoveryChannels.value?.radios || []).slice(0, 4),
  ...(discoveryChannels.value?.scenes || []).slice(0, 2)
])
const mvPreview = computed(() => (discoveryChannels.value?.mv || []).slice(0, 5))
const podcastPreview = computed(() => (discoveryChannels.value?.podcasts || []).slice(0, 5))
const playlistPreview = computed(() => preferencesStore.playlists.slice(0, 4))

const playlistHint = computed(() => {
  const parts = []
  if (activeFilters.value.artist) parts.push(`歌手：${activeFilters.value.artist}`)
  if (activeFilters.value.album) parts.push(`专辑：${activeFilters.value.album}`)
  if (activeFilters.value.excludeArtist) parts.push(`排除歌手：${activeFilters.value.excludeArtist}`)
  if (activeFilters.value.excludeAlbum) parts.push(`排除专辑：${activeFilters.value.excludeAlbum}`)
  return parts.length ? parts.join(' / ') : '从曲库随机推荐，点击卡片即可播放'
})

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

const playSongList = (list: Song[], song: Song, playlistId: string, playlistName: string) => {
  const idx = list.findIndex(item => item.url === song.url)
  if (idx < 0) return
  songsStore.setPlaylist(playlistId, playlistName, list)
  songsStore.playSong(idx)
}

const playLikedSongs = () => {
  if (!likedSongs.value.length) return
  songsStore.setPlaylist('liked-songs', '我喜欢', likedSongs.value)
  songsStore.playSong(0)
}

const playPlaylist = (playlist: UserPlaylist) => {
  if (!playlist.songs.length) return
  songsStore.setPlaylist(`user-playlist-${playlist.id}`, playlist.name, playlist.songs)
  songsStore.playSong(0)
}

const saveCurrentAsPlaylist = async () => {
  const baseName = activeFilters.value.artist || activeFilters.value.album || '当前推荐'
  const playlist = preferencesStore.createLocalPlaylist(`${baseName} ${new Date().toLocaleDateString()}`, songs.value)
  try {
    const saved = await $fetch<UserPlaylist>('/api/music/playlists', {
      method: 'POST',
      body: {
        profile_id: preferencesStore.profileId,
        name: playlist.name,
        description: playlist.description,
        song_ids: playlist.song_ids
      }
    })
    preferencesStore.removeLocalPlaylist(playlist.id!)
    preferencesStore.playlists.unshift(saved)
  } catch {
    await preferencesStore.pushCloudPreferences()
  }
}

const loadChart = async (chart: string) => {
  activeChart.value = chart
  chartSongs.value = await songsStore.chart(chart, 24)
}

const searchArtistOptions = async () => {
  const query = filterArtist.value.trim()
  artistOptions.value = query ? await songsStore.searchArtists(query, false, 8) : []
}

const searchAlbumOptions = async () => {
  const query = filterAlbum.value.trim()
  albumOptions.value = query ? await songsStore.searchAlbums(query, false, 8) : []
}

const playChannel = async (channel: DiscoveryChannel) => {
  if (channel.type === 'artist_radio') {
    await applyArtist(channel.name)
    return
  }
  if (channel.type === 'album_scene') {
    await applyAlbum(channel.name)
    return
  }
  await playRandomSongs()
}

const playChannelRadio = async () => {
  const first = channelPreview.value[0]
  if (first) await playChannel(first)
  else await playRandomSongs()
}

/**
 * 点击歌手，搜索该歌手的歌曲并跳转首页
 */
async function handleArtistClick(artistName: string) {
  const artistSongs = await songsStore.searchSongs('', false, undefined, artistName, 50)
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
  const albumSongs = await songsStore.searchSongs('', false, albumName, undefined, 50)
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
    const result = await songsStore.searchSongs('', true, undefined, undefined, 24, undefined, {
      ...activeFilters.value,
      includeAssets: true
    })
    if (result.length > 0) {
      songsStore.setPlaylist('random-discovery', '随机发现', result)
      await songsStore.playSong(0)
    }
  } finally {
    randomLoading.value = false
  }
}

const applyArtist = async (artistName: string) => {
  filterArtist.value = artistName
  filterAlbum.value = ''
  artistOptions.value = []
  albumOptions.value = []
  await reloadSongs()
}

const applyAlbum = async (albumName: string) => {
  filterAlbum.value = albumName
  filterArtist.value = ''
  artistOptions.value = []
  albumOptions.value = []
  await reloadSongs()
}

const clearFilters = async () => {
  filterArtist.value = ''
  filterAlbum.value = ''
  excludeArtist.value = ''
  excludeAlbum.value = ''
  fastListMode.value = false
  artistOptions.value = []
  albumOptions.value = []
  await reloadSongs()
}

const isSongLiked = (song: Song) => preferencesStore.isSongLiked(song)

const toggleLikedSong = (song: Song) => {
  preferencesStore.toggleLikedSong(song)
}

const blockSong = async (song: Song) => {
  preferencesStore.blockSong(song)
  await reloadSongs()
}

const blockArtist = async (artist: string) => {
  preferencesStore.blockArtist(artist)
  await reloadSongs()
}

const blockAlbum = async (album: string) => {
  preferencesStore.blockAlbum(album)
  await reloadSongs()
}

const unblockSong = async (song: Song) => {
  preferencesStore.unblockSong(song)
  await reloadSongs()
}

const unblockArtist = async (artist: string) => {
  preferencesStore.unblockArtist(artist)
  await reloadSongs()
}

const unblockAlbum = async (album: string) => {
  preferencesStore.unblockAlbum(album)
  await reloadSongs()
}

const clearBlockedContent = async () => {
  preferencesStore.clearBlockedContent()
  await reloadSongs()
}

/**
 * 加载首页所有数据
 */
const loadHomeData = async () => {
  await songsStore.fetchHomeData(activeFilters.value)
}

const loadAppFeatures = async () => {
  const [recommend, chartResult, channelResult] = await Promise.all([
    songsStore.recommendations(preferencesStore.profileId, 24),
    songsStore.chart(activeChart.value, 24),
    songsStore.channels()
  ])
  dailySongs.value = recommend
  chartSongs.value = chartResult
  discoveryChannels.value = channelResult as DiscoveryChannels
}

const cardClasses = computed(() =>
  [
    'relative',
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
  await loadAppFeatures()
})
</script>

<style scoped>
.container {
  max-width: 900px;
}
.discovery-panel {
  overflow: hidden;
}
.song-grid > * {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.preference-card {
  overflow: hidden;
}
.preference-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr);
  gap: 0.75rem;
  width: 100%;
  border-radius: 0.375rem;
  padding: 0.375rem 0.5rem;
  text-align: left;
}
.preference-row:hover {
  background: color-mix(in oklab, currentColor 8%, transparent);
}
.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  max-height: 4.75rem;
  overflow: auto;
}
</style>
