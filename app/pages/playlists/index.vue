<template>
  <div class="container mx-auto space-y-6">
    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-3xl font-bold">我的歌单</h1>
        <p class="mt-2 text-sm text-muted">本地可用，登录同一同步 ID 后可跨设备恢复。</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton icon="i-lucide-cloud-download" variant="soft" :loading="preferencesStore.syncLoading" @click="loadCloudPlaylists">
          拉取
        </UButton>
        <UButton icon="i-lucide-cloud-upload" variant="soft" :loading="preferencesStore.syncLoading" @click="preferencesStore.pushCloudPreferences">
          保存
        </UButton>
      </div>
    </div>

    <UCard class="card-surface border-theme">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
        <UInput v-model="newPlaylistName" icon="i-lucide-list-plus" placeholder="新歌单名称" @keyup.enter="createPlaylist" />
        <UButton icon="i-lucide-plus" color="primary" @click="createPlaylist">新建</UButton>
      </div>
    </UCard>

    <div v-if="playlists.length" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <UCard v-for="playlist in playlists" :key="playlist.id" class="card-surface border-theme">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="truncate text-lg font-bold">{{ playlist.name }}</h2>
            <p class="text-xs text-muted">{{ playlist.songs.length }} 首</p>
          </div>
          <div class="flex shrink-0 gap-1">
            <UButton icon="i-lucide-play" size="xs" variant="soft" @click="playPlaylist(playlist)" />
            <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="removePlaylist(playlist)" />
          </div>
        </div>
        <div class="mt-3 space-y-2">
          <button
            v-for="song in playlist.songs.slice(0, 8)"
            :key="`${playlist.id}-${song.id}-${song.url}`"
            class="playlist-row"
            type="button"
            @click="playSong(playlist, song)"
          >
            <span class="truncate">{{ song.name }}</span>
            <span class="truncate text-muted">{{ song.artist }}</span>
          </button>
        </div>
      </UCard>
    </div>

    <UEmpty v-else icon="i-lucide-list-music" title="还没有歌单" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useMusicPreferencesStore } from '@/stores/preferences'
import { useSongsStore } from '@/stores/songs'
import type { Song, UserPlaylist } from '@/types'

const preferencesStore = useMusicPreferencesStore()
const songsStore = useSongsStore()
const newPlaylistName = ref('')
const playlists = computed(() => preferencesStore.playlists)

const loadCloudPlaylists = async () => {
  await preferencesStore.pullCloudPreferences()
  try {
    const remote = await $fetch<UserPlaylist[]>('/api/music/playlists', {
      params: {
        profile_id: preferencesStore.profileId,
        include_assets: true
      }
    })
    preferencesStore.playlists = remote
  } catch (error) {
    console.warn('Failed to load remote playlists:', error)
  }
}

const createPlaylist = async () => {
  const name = newPlaylistName.value.trim()
  if (!name) return
  const playlist = preferencesStore.createLocalPlaylist(name, [])
  newPlaylistName.value = ''
  try {
    const saved = await $fetch<UserPlaylist>('/api/music/playlists', {
      method: 'POST',
      body: {
        profile_id: preferencesStore.profileId,
        name,
        song_ids: []
      }
    })
    preferencesStore.removeLocalPlaylist(playlist.id!)
    preferencesStore.playlists.unshift(saved)
  } catch {
    await preferencesStore.pushCloudPreferences()
  }
}

const playPlaylist = (playlist: UserPlaylist) => {
  if (!playlist.songs.length) return
  songsStore.setPlaylist(`user-playlist-${playlist.id}`, playlist.name, playlist.songs)
  songsStore.playSong(0)
}

const playSong = (playlist: UserPlaylist, song: Song) => {
  const index = playlist.songs.findIndex(item => item.url === song.url)
  if (index < 0) return
  songsStore.setPlaylist(`user-playlist-${playlist.id}`, playlist.name, playlist.songs)
  songsStore.playSong(index)
}

const removePlaylist = async (playlist: UserPlaylist) => {
  preferencesStore.removeLocalPlaylist(playlist.id!)
  if (typeof playlist.id === 'number') {
    try {
      await $fetch(`/api/music/playlists/${playlist.id}`, {
        method: 'DELETE',
        params: { profile_id: preferencesStore.profileId }
      })
    } catch (error) {
      console.warn('Failed to remove remote playlist:', error)
    }
  }
}

onMounted(loadCloudPlaylists)
</script>

<style scoped>
.container {
  max-width: 980px;
}
.playlist-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr);
  gap: 0.75rem;
  width: 100%;
  border-radius: 0.375rem;
  padding: 0.375rem 0.5rem;
  text-align: left;
}
.playlist-row:hover {
  background: color-mix(in oklab, currentColor 8%, transparent);
}
</style>
