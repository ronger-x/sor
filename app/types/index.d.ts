export interface Song {
  url: string
  lrc: string
  cover: string
  name: string
  artist: string
  album?: string
  duration?: number
}

export interface Playlist {
  id: string
  name: string
  items: Song[]
  createdAt?: Date
  updatedAt?: Date
}

export type PlayMode = 'sequential' | 'repeat-one' | 'shuffle'

export interface LyricLine {
  time: number
  text: string
}

export interface BufferedRange {
  start: number
  end: number
}
