export interface Song {
  id: number
  url: string
  lrc: string | null
  cover: string | null
  name: string
  artist: string
  album?: string
  duration?: number
}

export interface SongUploadResult extends Song {
  audio_key: string
  cover_key?: string | null
  lyrics_key?: string | null
  file_hash: string
  deduped: boolean
}

export interface SongSearchFilters {
  artist?: string
  album?: string
  excludeArtist?: string
  excludeAlbum?: string
  includeAssets?: boolean
}

export interface MusicPreferencesPayload {
  likedSongs?: Song[]
  recentSongs?: Song[]
  blockedSongs?: Song[]
  blockedArtists?: string[]
  blockedAlbums?: string[]
  playlists?: UserPlaylist[]
}

export interface UserPlaylist {
  id?: number | string
  profile_id?: string
  name: string
  description?: string | null
  song_ids?: number[]
  songs: Song[]
  created_at?: string
  updated_at?: string
}

export interface SongComment {
  id: number
  song_id: number
  profile_id?: string | null
  nickname?: string | null
  body: string
  created_at?: string | null
}

export interface LyricAssist {
  song_id: number
  translation?: string | null
  updated_by_profile?: string | null
  updated_at?: string | null
}

export interface DiscoveryChannel {
  type: string
  name: string
  count?: number
  source?: string
  query?: Record<string, unknown>
}

export interface DiscoveryChannels {
  kind: string
  radios: DiscoveryChannel[]
  scenes: DiscoveryChannel[]
  podcasts: DiscoveryChannel[]
  mv: DiscoveryChannel[]
  albums: DiscoveryChannel[]
}

export interface Artist {
  artist: string
  count: number | string
  cover: string | null
}

export interface Album {
  album: string
  count: number | string
  cover: string | null
}

export interface Playlist {
  id: string
  name: string
  items: Song[]
  createdAt?: Date
  updatedAt?: Date
}

export type PlayMode = 'sequential' | 'repeat-one' | 'shuffle'
export type LyricViewMode = 'vinyl' | 'focus' | 'compact'

export interface LyricLine {
  time: number
  text: string
}

export interface BufferedRange {
  start: number
  end: number
}
