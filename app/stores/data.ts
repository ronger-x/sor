import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Album, Artist, Song } from '@/types'

/**
 * 数据获取 Store
 */
export const useDataStore = defineStore('data', () => {
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
    offset?: number
  ) {
    let result: Song[] = []
    try {
      const params: Record<string, any> = {
        q,
        random,
        album,
        artist,
        limit: limit || 50,
        offset
      }
      Object.keys(params).forEach(k => params[k] === undefined && delete params[k])
      const res = await $fetch('/api/songs', { params })
      result = res as Song[]
    } catch (e) {
      result = []
      console.error('Failed to fetch songs:', e)
    }
    return result
  }

  /**
   * 搜索专辑
   */
  async function searchAlbums(artist?: string, random?: boolean, limit?: number, offset?: number) {
    let result: Album[] = []
    try {
      const params: Record<string, any> = {
        artist,
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
  async function fetchHomeData() {
    homeLoading.value = true
    try {
      const [songsResult, artistsResult, albumsResult] = await Promise.all([
        searchSongs('', true, undefined, undefined, 50),
        searchArtists('', true),
        searchAlbums('', true)
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
    searchAlbums,
    searchArtists,
    fetchHomeData,
    loadAllArtists,
    loadAllAlbums
  }
})
