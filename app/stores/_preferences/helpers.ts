import type { Song, SongSearchFilters, UserPlaylist } from '@/types'

export const STORAGE_KEY = 'sor.music.preferences.v1'
export const MAX_RECENT_SONGS = 40
export const MAX_LIKED_SONGS = 200
export const MAX_BLOCKED_SONGS = 300

export type StoredPreferences = {
  likedSongs?: Song[]
  recentSongs?: Song[]
  blockedSongs?: Song[]
  blockedArtists?: string[]
  blockedAlbums?: string[]
  playlists?: UserPlaylist[]
  profileId?: string
  displayName?: string
}

export function normalizeText(value?: string | null) {
  return (value || '').trim().toLocaleLowerCase()
}

export function songKey(song?: Pick<Song, 'id' | 'name' | 'artist' | 'album'> | null) {
  if (!song) return ''
  if (song.id !== undefined && song.id !== null) return `id:${song.id}`
  return [song.name, song.artist, song.album].map(normalizeText).join('|')
}

export function dedupeSongs(items: Song[], limit: number) {
  const seen = new Set<string>()
  const result: Song[] = []
  for (const item of items) {
    const key = songKey(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(item)
    if (result.length >= limit) break
  }
  return result
}

export function dedupeText(items: string[]) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const cleaned = item.trim()
    const key = normalizeText(cleaned)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(cleaned)
  }
  return result
}

export function textIncludes(value: string | undefined, needle: string | undefined) {
  const normalizedNeedle = normalizeText(needle)
  if (!normalizedNeedle) return false
  return normalizeText(value).includes(normalizedNeedle)
}

/**
 * Pure predicate: should a song be hidden given the blocked sets and filters?
 * Kept free of store state so the matching rules can be unit-tested in isolation.
 */
export function songMatchesBlock(
  song: Song,
  sets: {
    blockedSongKeys: Set<string>
    blockedArtistKeys: Set<string>
    blockedAlbumKeys: Set<string>
  },
  filters: SongSearchFilters = {}
) {
  const key = songKey(song)
  return (
    (Boolean(key) && sets.blockedSongKeys.has(key)) ||
    sets.blockedArtistKeys.has(normalizeText(song.artist)) ||
    sets.blockedAlbumKeys.has(normalizeText(song.album)) ||
    textIncludes(song.artist, filters.excludeArtist) ||
    textIncludes(song.album, filters.excludeAlbum)
  )
}
