import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Album, Artist, Song, SongSearchFilters } from '@/types'
import { useMusicPreferencesStore } from './preferences'

/**
 * 数据获取 Store
 */
export const useDataStore = defineStore('data', () => {
  const preferencesStore = useMusicPreferencesStore()
  const songs = ref<Song[]>([])
  const artists = ref<Artist[]>([])
  const albums = ref<Album[]>([])
  const homeLoading = ref(false)

  // 歌手页面专用数据
  const allArtists = ref<Artist[]>([])
  const artistsLoading = ref(false)
  const artistsHasMore = ref(true)
  const artistsOffset = ref(0)
  const artistsQuery = ref('')

  // 专辑页面专用数据
  const allAlbums = ref<Album[]>([])
  const albumsLoading = ref(false)
  const albumsHasMore = ref(true)
  const albumsOffset = ref(0)
  const albumsQuery = ref('')

  /**
   * 搜索歌曲
   */
  async function searchSongs(
    q?: string,
    random?: boolean,
    album?: string,
    artist?: string,
    limit?: number,
    offset?: number,
    filters: SongSearchFilters = {}
  ) {
    let result: Song[] = []
    try {
      const params: Record<string, any> = {
        q,
        random,
        album: filters.album ?? album,
        artist: filters.artist ?? artist,
        exclude_artist: filters.excludeArtist,
        exclude_album: filters.excludeAlbum,
        include_assets: filters.includeAssets,
        limit: limit || 50,
        offset
      }
      Object.keys(params).forEach(k => {
        if (params[k] === undefined || params[k] === null || params[k] === '') {
          delete params[k]
        }
      })
      const res = await $fetch('/api/songs', { params })
      result = preferencesStore.filterVisibleSongs(res as Song[], filters)
    } catch (e) {
      result = []
      console.error('Failed to fetch songs:', e)
    }
    return result
  }

  async function recommendations(profileId?: string, limit: number = 50) {
    try {
      const res = await $fetch<Song[]>('/api/music/recommendations', {
        params: {
          profile_id: profileId,
          limit,
          include_assets: true
        }
      })
      return preferencesStore.filterVisibleSongs(res)
    } catch (e) {
      console.error('Failed to fetch recommendations:', e)
      return searchSongs('', true, undefined, undefined, limit, undefined, { includeAssets: true })
    }
  }

  async function similar(songId: number, limit: number = 24) {
    try {
      const res = await $fetch<Song[]>(`/api/music/similar/${songId}`, {
        params: {
          limit,
          include_assets: true
        }
      })
      return preferencesStore.filterVisibleSongs(res)
    } catch (e) {
      console.error('Failed to fetch similar songs:', e)
      return searchSongs('', true, undefined, undefined, limit, undefined, { includeAssets: true })
    }
  }

  async function chart(chart: string, limit: number = 50) {
    try {
      const res = await $fetch<{ songs: Song[] }>('/api/music/charts', {
        params: {
          chart,
          limit,
          include_assets: true
        }
      })
      return preferencesStore.filterVisibleSongs(res.songs || [])
    } catch (e) {
      console.error('Failed to fetch chart:', e)
      return searchSongs('', chart === 'hot', undefined, undefined, limit, undefined, { includeAssets: true })
    }
  }

  async function channels() {
    try {
      return await $fetch('/api/music/channels')
    } catch (e) {
      console.error('Failed to fetch channels:', e)
      return {
        kind: 'fallback',
        radios: [],
        scenes: [],
        podcasts: [],
        mv: [],
        albums: []
      }
    }
  }

  async function recordEvent(song: Song | null | undefined, eventType: string, profileId?: string) {
    if (!song?.id) return
    try {
      await $fetch('/api/music/events', {
        method: 'POST',
        body: {
          song_id: song.id,
          event_type: eventType,
          profile_id: profileId
        }
      })
    } catch (e) {
      console.warn('Failed to record song event:', e)
    }
  }

  /**
   * 搜索专辑
   */
  async function searchAlbums(q?: string, random?: boolean, limit?: number, offset?: number) {
    let result: Album[] = []
    try {
      const params: Record<string, any> = {
        q,
        random,
        limit: limit || 20,
        offset
      }
      Object.keys(params).forEach(k => params[k] === undefined && delete params[k])
      const res = await $fetch<any>('/api/albums', { params })
      // 处理不同的返回格式
      if (Array.isArray(res)) {
        result = res
      } else if (res && Array.isArray(res.albums)) {
        result = res.albums
      } else if (res && typeof res === 'object') {
        result = []
      }
    } catch (e) {
      result = []
      console.error('Failed to fetch albums:', e)
    }
    return result
  }

  /**
   * 搜索歌手
   */
  async function searchArtists(q?: string, random?: boolean, limit?: number, offset?: number) {
    let result: Artist[] = []
    try {
      const params: Record<string, any> = {
        q,
        random,
        limit: limit || 20,
        offset
      }
      Object.keys(params).forEach(k => params[k] === undefined && delete params[k])
      const res = await $fetch<any>('/api/artists', { params })
      // 处理不同的返回格式
      if (Array.isArray(res)) {
        result = res
      } else if (res && Array.isArray(res.artists)) {
        result = res.artists
      } else if (res && typeof res === 'object') {
        result = []
      }
    } catch (e) {
      result = []
      console.error('Failed to fetch artists:', e)
    }
    return result
  }

  /**
   * 获取首页所有数据（歌曲、歌手、专辑）
   */
  async function fetchHomeData(filters: SongSearchFilters = {}) {
    homeLoading.value = true
    try {
      const listFilters: SongSearchFilters = {
        ...filters,
        includeAssets: filters.includeAssets ?? true
      }
      const [songsResult, artistsResult, albumsResult] = await Promise.all([
        searchSongs('', true, undefined, undefined, 50, undefined, listFilters),
        searchArtists('', true, 20),
        searchAlbums('', true, 20)
      ])
      songs.value = songsResult
      artists.value = artistsResult
      albums.value = albumsResult
      return { songs: songsResult, artists: artistsResult, albums: albumsResult }
    } catch (e) {
      console.error('Failed to fetch home data:', e)
      return { songs: [], artists: [], albums: [] }
    } finally {
      homeLoading.value = false
    }
  }

  /**
   * 加载全部歌手（用于歌手页面）
   */
  async function loadAllArtists(reset: boolean = false, query?: string) {
    // 如果查询条件变化，重置列表
    if (query !== undefined && query !== artistsQuery.value) {
      artistsQuery.value = query
      reset = true
    }

    if (reset) {
      allArtists.value = []
      artistsOffset.value = 0
      artistsHasMore.value = true
    }

    if (artistsLoading.value || !artistsHasMore.value) {
      return
    }

    artistsLoading.value = true
    try {
      const limit = 24
      const result = await searchArtists(
        artistsQuery.value || undefined,
        false,
        limit,
        artistsOffset.value
      )

      if (result.length > 0) {
        allArtists.value = [...allArtists.value, ...result]
        artistsOffset.value += result.length
        artistsHasMore.value = result.length >= limit
      } else {
        artistsHasMore.value = false
      }

      return result
    } finally {
      artistsLoading.value = false
    }
  }

  /**
   * 加载全部专辑（用于专辑页面）
   */
  async function loadAllAlbums(reset: boolean = false, artistQuery?: string) {
    // 如果查询条件变化，重置列表
    if (artistQuery !== undefined && artistQuery !== albumsQuery.value) {
      albumsQuery.value = artistQuery
      reset = true
    }

    if (reset) {
      allAlbums.value = []
      albumsOffset.value = 0
      albumsHasMore.value = true
    }

    if (albumsLoading.value || !albumsHasMore.value) {
      return
    }

    albumsLoading.value = true
    try {
      const limit = 24
      const result = await searchAlbums(
        albumsQuery.value || undefined,
        false,
        limit,
        albumsOffset.value
      )

      if (result.length > 0) {
        allAlbums.value = [...allAlbums.value, ...result]
        albumsOffset.value += result.length
        albumsHasMore.value = result.length >= limit
      } else {
        albumsHasMore.value = false
      }

      return result
    } finally {
      albumsLoading.value = false
    }
  }

  return {
    songs,
    artists,
    albums,
    homeLoading,
    allArtists,
    artistsLoading,
    artistsHasMore,
    allAlbums,
    albumsLoading,
    albumsHasMore,
    searchSongs,
    recommendations,
    similar,
    chart,
    channels,
    recordEvent,
    searchAlbums,
    searchArtists,
    fetchHomeData,
    loadAllArtists,
    loadAllAlbums
  }
})
