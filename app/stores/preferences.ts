import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { MusicPreferencesPayload, Song, SongSearchFilters, UserPlaylist } from '@/types'
import {
  MAX_BLOCKED_SONGS,
  MAX_LIKED_SONGS,
  MAX_RECENT_SONGS,
  STORAGE_KEY,
  type StoredPreferences,
  dedupeSongs,
  dedupeText,
  normalizeText,
  songKey,
  songMatchesBlock
} from './_preferences/helpers'

export const useMusicPreferencesStore = defineStore('music-preferences', () => {
  const profileId = ref('')
  const displayName = ref('')
  const likedSongs = ref<Song[]>([])
  const recentSongs = ref<Song[]>([])
  const blockedSongs = ref<Song[]>([])
  const blockedArtists = ref<string[]>([])
  const blockedAlbums = ref<string[]>([])
  const playlists = ref<UserPlaylist[]>([])
  const hydrated = ref(false)
  const syncLoading = ref(false)
  const syncError = ref<string | null>(null)

  const likedSongKeys = computed(() => new Set(likedSongs.value.map(songKey).filter(Boolean)))
  const blockedSongKeys = computed(() => new Set(blockedSongs.value.map(songKey).filter(Boolean)))
  const blockedArtistKeys = computed(
    () => new Set(blockedArtists.value.map(normalizeText).filter(Boolean))
  )
  const blockedAlbumKeys = computed(
    () => new Set(blockedAlbums.value.map(normalizeText).filter(Boolean))
  )
  const hasBlockedContent = computed(
    () =>
      blockedSongs.value.length > 0 ||
      blockedArtists.value.length > 0 ||
      blockedAlbums.value.length > 0
  )

  function hydrate() {
    if (!import.meta.client || hydrated.value) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const stored = JSON.parse(raw) as StoredPreferences
        likedSongs.value = dedupeSongs(stored.likedSongs || [], MAX_LIKED_SONGS)
        recentSongs.value = dedupeSongs(stored.recentSongs || [], MAX_RECENT_SONGS)
        blockedSongs.value = dedupeSongs(stored.blockedSongs || [], MAX_BLOCKED_SONGS)
        blockedArtists.value = dedupeText(stored.blockedArtists || [])
        blockedAlbums.value = dedupeText(stored.blockedAlbums || [])
        playlists.value = stored.playlists || []
        profileId.value = stored.profileId || ''
        displayName.value = stored.displayName || ''
      }
      if (!profileId.value) profileId.value = `sor-${crypto.randomUUID()}`
    } catch (error) {
      console.warn('Failed to load music preferences:', error)
    } finally {
      hydrated.value = true
    }
  }

  function persist() {
    if (!import.meta.client || !hydrated.value) return
    const payload: StoredPreferences = {
      likedSongs: likedSongs.value,
      recentSongs: recentSongs.value,
      blockedSongs: blockedSongs.value,
      blockedArtists: blockedArtists.value,
      blockedAlbums: blockedAlbums.value,
      playlists: playlists.value,
      profileId: profileId.value,
      displayName: displayName.value
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
      console.warn('Failed to save music preferences:', error)
    }
  }

  function isSongLiked(song?: Song | null) {
    const key = songKey(song)
    return Boolean(key && likedSongKeys.value.has(key))
  }

  function isSongBlocked(song?: Song | null) {
    const key = songKey(song)
    return Boolean(key && blockedSongKeys.value.has(key))
  }

  function isArtistBlocked(artist?: string | null) {
    const key = normalizeText(artist)
    return Boolean(key && blockedArtistKeys.value.has(key))
  }

  function isAlbumBlocked(album?: string | null) {
    const key = normalizeText(album)
    return Boolean(key && blockedAlbumKeys.value.has(key))
  }

  function shouldHideSong(song: Song, filters: SongSearchFilters = {}) {
    return songMatchesBlock(
      song,
      {
        blockedSongKeys: blockedSongKeys.value,
        blockedArtistKeys: blockedArtistKeys.value,
        blockedAlbumKeys: blockedAlbumKeys.value
      },
      filters
    )
  }

  function filterVisibleSongs(songs: Song[], filters: SongSearchFilters = {}) {
    return songs.filter(song => !shouldHideSong(song, filters))
  }

  function addRecentSong(song?: Song | null) {
    if (!song) return
    recentSongs.value = dedupeSongs([song, ...recentSongs.value], MAX_RECENT_SONGS)
  }

  function toggleLikedSong(song?: Song | null) {
    if (!song) return false
    if (isSongLiked(song)) {
      const key = songKey(song)
      likedSongs.value = likedSongs.value.filter(item => songKey(item) !== key)
      return false
    }
    likedSongs.value = dedupeSongs([song, ...likedSongs.value], MAX_LIKED_SONGS)
    return true
  }

  function blockSong(song?: Song | null) {
    if (!song) return
    blockedSongs.value = dedupeSongs([song, ...blockedSongs.value], MAX_BLOCKED_SONGS)
    const key = songKey(song)
    likedSongs.value = likedSongs.value.filter(item => songKey(item) !== key)
  }

  function unblockSong(song?: Song | null) {
    const key = songKey(song)
    if (!key) return
    blockedSongs.value = blockedSongs.value.filter(item => songKey(item) !== key)
  }

  function blockArtist(artist?: string | null) {
    const value = (artist || '').trim()
    if (!value) return
    blockedArtists.value = dedupeText([value, ...blockedArtists.value])
    likedSongs.value = likedSongs.value.filter(song => !isArtistBlocked(song.artist))
  }

  function unblockArtist(artist?: string | null) {
    const key = normalizeText(artist)
    if (!key) return
    blockedArtists.value = blockedArtists.value.filter(item => normalizeText(item) !== key)
  }

  function blockAlbum(album?: string | null) {
    const value = (album || '').trim()
    if (!value) return
    blockedAlbums.value = dedupeText([value, ...blockedAlbums.value])
    likedSongs.value = likedSongs.value.filter(song => !isAlbumBlocked(song.album))
  }

  function unblockAlbum(album?: string | null) {
    const key = normalizeText(album)
    if (!key) return
    blockedAlbums.value = blockedAlbums.value.filter(item => normalizeText(item) !== key)
  }

  function clearBlockedContent() {
    blockedSongs.value = []
    blockedArtists.value = []
    blockedAlbums.value = []
  }

  function clearRecentSongs() {
    recentSongs.value = []
  }

  function preferencesPayload(): MusicPreferencesPayload {
    return {
      likedSongs: likedSongs.value,
      recentSongs: recentSongs.value,
      blockedSongs: blockedSongs.value,
      blockedArtists: blockedArtists.value,
      blockedAlbums: blockedAlbums.value,
      playlists: playlists.value
    }
  }

  function applyPreferences(payload: MusicPreferencesPayload = {}) {
    likedSongs.value = dedupeSongs(payload.likedSongs || [], MAX_LIKED_SONGS)
    recentSongs.value = dedupeSongs(payload.recentSongs || [], MAX_RECENT_SONGS)
    blockedSongs.value = dedupeSongs(payload.blockedSongs || [], MAX_BLOCKED_SONGS)
    blockedArtists.value = dedupeText(payload.blockedArtists || [])
    blockedAlbums.value = dedupeText(payload.blockedAlbums || [])
    playlists.value = payload.playlists || []
  }

  async function pullCloudPreferences() {
    if (!profileId.value) hydrate()
    syncLoading.value = true
    syncError.value = null
    try {
      const response = await $fetch<{
        profile_id: string
        display_name?: string | null
        preferences?: MusicPreferencesPayload
      }>(`/api/music/profile/${encodeURIComponent(profileId.value)}/preferences`)
      if (response.display_name) displayName.value = response.display_name
      applyPreferences(response.preferences || {})
      persist()
      return true
    } catch (error: any) {
      syncError.value = error?.message || '同步失败'
      return false
    } finally {
      syncLoading.value = false
    }
  }

  async function pushCloudPreferences() {
    if (!profileId.value) hydrate()
    syncLoading.value = true
    syncError.value = null
    try {
      await $fetch('/api/music/profile/preferences', {
        method: 'PUT',
        body: {
          profile_id: profileId.value,
          display_name: displayName.value || undefined,
          preferences: preferencesPayload()
        }
      })
      persist()
      return true
    } catch (error: any) {
      syncError.value = error?.message || '同步失败'
      return false
    } finally {
      syncLoading.value = false
    }
  }

  function createLocalPlaylist(name: string, songs: Song[] = [], description?: string) {
    const playlist: UserPlaylist = {
      id: `local-${Date.now()}`,
      name: name.trim(),
      description,
      songs,
      song_ids: songs.map(song => song.id).filter(Boolean)
    }
    playlists.value = [playlist, ...playlists.value]
    return playlist
  }

  function removeLocalPlaylist(id: string | number) {
    playlists.value = playlists.value.filter(playlist => playlist.id !== id)
  }

  function addSongToLocalPlaylist(id: string | number, song: Song) {
    const playlist = playlists.value.find(item => item.id === id)
    if (!playlist) return
    playlist.songs = dedupeSongs([...(playlist.songs || []), song], 1000)
    playlist.song_ids = playlist.songs.map(item => item.id).filter(Boolean)
  }

  if (import.meta.client) {
    hydrate()
    watch(
      [likedSongs, recentSongs, blockedSongs, blockedArtists, blockedAlbums, playlists, profileId, displayName],
      () => persist(),
      { deep: true }
    )
  }

  return {
    profileId,
    displayName,
    likedSongs,
    recentSongs,
    blockedSongs,
    blockedArtists,
    blockedAlbums,
    playlists,
    hydrated,
    syncLoading,
    syncError,
    hasBlockedContent,
    hydrate,
    isSongLiked,
    isSongBlocked,
    isArtistBlocked,
    isAlbumBlocked,
    shouldHideSong,
    filterVisibleSongs,
    addRecentSong,
    toggleLikedSong,
    blockSong,
    unblockSong,
    blockArtist,
    unblockArtist,
    blockAlbum,
    unblockAlbum,
    clearBlockedContent,
    clearRecentSongs,
    preferencesPayload,
    applyPreferences,
    pullCloudPreferences,
    pushCloudPreferences,
    createLocalPlaylist,
    removeLocalPlaylist,
    addSongToLocalPlaylist
  }
})
