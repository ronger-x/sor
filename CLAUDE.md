# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SOR is a lightweight music client built with Nuxt 3, providing search, streaming, lyrics display, and playlist management. The app runs in SPA mode (SSR disabled) and integrates with an external music API backend.

**Core Tech Stack:**
- Nuxt 3 (v4.2.2) with SSR disabled
- @nuxt/ui for UI components
- Pinia for state management
- @nuxtjs/mcp-toolkit for MCP (Model Context Protocol) server integration
- pnpm as package manager

## Development Commands

```bash
# Install dependencies
pnpm install

# Start dev server (http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Preview production build locally
pnpm preview

# Type checking
npx vue-tsc --noEmit
```

## Environment Configuration

Required environment variables (create `.env` file in root):

```
NUXT_MUSIC_API_URL=your-music-api-url
NUXT_MUSIC_API_KEY=your-music-api-key
```

Optional features (upload / WeChat / share) add more variables — see `.env.example` for the full list. Key points:

- **Upload auth is a separate trust domain.** `NUXT_UPLOAD_SESSION_SECRET` must be configured explicitly; it intentionally does NOT fall back to `NUXT_MUSIC_API_KEY`. Upload features stay disabled until both `NUXT_UPLOAD_PASSWORD` and the session secret are set.
- No production domain is baked into the source — `NUXT_UPLOAD_PUBLIC_URL` defaults to the relative path `/library`.

These are loaded via `nuxt.config.ts` runtimeConfig and used by server API routes to proxy requests to the upstream music service.

## Architecture

### Directory Structure

- **`/app`** - Client-side application code
  - `/components` - UI components (PlayerBar, LyricViewer, LyricOverlay, SongSearch, SongShareButton)
  - `/composables` - Reusable composition functions (audio player, lyrics sync, playlist management, volume control, buffer management, media session API)
  - `/stores` - Pinia stores (songs, lyrics, volume, data, preferences)
  - `/pages` - File-based routing pages (index, albums, artists, lyric, library, listen, playlists, podcasts, visuals, share/[token])
  - `/layouts` - Layout components
  - `app.vue` - Root component

- **`/server`** - Server-side code (API routes + shared utils + MCP tools)
  - `/api` - Nuxt API routes that proxy to external music API (songs, albums, artists, lyrics) plus upload-session, music upload/passthrough, song share, share/[token], and wechat/message endpoints
  - `/utils` - Shared server helpers: `musicApi.ts` (API proxy builder), `uploadAuth.ts` (HMAC upload session/card), `wechatMp.ts` (WeChat signature + reply)
  - `/mcp/tools` - MCP tool definitions (getSongs, getAlbums, getArtists, getLyrics)
  - `/mcp/resources` - MCP resource definitions

- **`/public`** - Static assets

### State Management Architecture

The app uses a modular Pinia store architecture with clear separation of concerns:

1. **`useSongsStore`** (main orchestrator) - Coordinates all playback, playlist, and UI state. Imports and delegates to:
   - `useVolumeStore` - Volume and mute state
   - `useLyricsStore` - Lyric fetching, parsing, and sync
   - `useDataStore` - API data fetching (songs/albums/artists)

2. **`useMusicPreferencesStore`** - Local-first user preferences persisted to localStorage: liked/recent/blocked songs, blocked artists/albums, local playlists, and optional cloud sync. Provides `filterVisibleSongs`/`shouldHideSong` used to hide blocked content from results.

3. **Composables** provide reusable logic imported by stores:
   - `useAudioPlayer` - HTMLAudioElement reference management
   - `usePlaylistManagement` - Playlist state, play modes (sequential/random/single repeat), next/prev logic
   - `useMediaSessionAPI` - Browser Media Session API integration for OS-level controls
   - `useBufferManagement` - Audio buffering state tracking
   - `useLyricSync` - Real-time lyric synchronization with playback
   - `useVolumeControl` - Volume calculation and persistence

### API Proxy Pattern

All music data flows through server-side API routes (`/server/api/*.ts`). Shared proxy logic lives in `server/utils/musicApi.ts` (`fetchMusicApi`, `buildMusicApiUrl`, `buildMusicApiHeaders`), which:
- Read `NUXT_MUSIC_API_URL` and `NUXT_MUSIC_API_KEY` from runtimeConfig
- Forward client query params to upstream API
- Add `X-API-KEY` header and client IP forwarding (`X-Forwarded-For`)
- Handle errors with proper H3 error responses

New routes should reuse `fetchMusicApi` rather than re-implementing the proxy. `/api/songs` is the explicit search route; `/api/music/[...path]` is a generic passthrough for other upstream endpoints. Client code calls these proxy routes (e.g., `/api/songs?q=search`) rather than hitting the external API directly.

### Upload & Share Auth

- **Upload sessions** (`server/utils/uploadAuth.ts`): password or HMAC-signed temporary "upload card" → `httpOnly`/`secure` session cookie. Secrets use constant-time comparison and are decoupled from the music API key.
- **WeChat integration** (`server/utils/wechatMp.ts`): validates callback signatures (SHA1 per WeChat MP spec) and auto-issues upload cards in reply to keyword messages.
- **Share links**: `POST /api/songs/{songId}/share` creates a token; the server rewrites the share URL to the current request's host/protocol so links resolve locally. Public share page is `/share/{token}`.

### MCP Integration

The app exposes an MCP server at `/mcp` route with tools for searching songs, albums, artists, and fetching lyrics. MCP tools mirror the API routes but are designed for AI agent consumption.

## Key Implementation Details

### Audio Playback Flow

1. User selects song → `playSong(index)` called in `useSongsStore`
2. Store updates `currentSong`, pauses current audio, sets new `audio.src`
3. Waits for `canplay` event, then calls `audio.play()`
4. On play success: starts lyric sync, updates Media Session, preloads next song
5. Audio events (`timeupdate`, `ended`) trigger store methods to update UI and handle auto-advance

### Play Modes

Managed by `usePlaylistManagement` composable:
- **Sequential** (`playMode: 'sequential'`) - Play in order, stop at end
- **Random** (`playMode: 'random'`) - Shuffle order, avoid immediate repeats
- **Single Repeat** (`playMode: 'repeat-one'`) - Loop current song

### Lyric Synchronization

- Lyrics parsed from LRC format (timecoded text)
- `useLyricSync` composable maintains sync loop using `requestAnimationFrame`
- Current line highlighted based on `audio.currentTime`
- User can click lyric lines to seek to that timestamp

## Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t sor:latest .

# Run container
docker run -d --name sor -p 3000:3000 \
  -e NUXT_MUSIC_API_URL="your-api-url" \
  -e NUXT_MUSIC_API_KEY="your-api-key" \
  sor:latest
```

Or use docker compose:

```bash
# Ensure .env file exists with NUXT_MUSIC_API_URL and NUXT_MUSIC_API_KEY
docker compose up -d
```

The Dockerfile uses multi-stage build (builder + runner) with non-root user for security.

## Common Patterns

### Adding a New API Endpoint

1. Create server route in `/server/api/your-endpoint.ts` following the proxy pattern in `songs.ts`
2. Add corresponding MCP tool in `/server/mcp/tools/yourTool.ts` if needed
3. Add fetch method to `useDataStore` if client-side access required
4. Call from component or store as needed

### Adding a New Composable

Composables should be pure functions that accept refs/values and return reactive state + methods. See existing composables for patterns. Place in `/app/composables/`.

### Working with Pinia Stores

Import stores in components with `const store = useSongsStore()`. Access state directly (`store.isPlaying`) and call actions as methods (`store.togglePlay()`). Stores can import other stores but avoid circular dependencies.

## Notes

- The app is SPA-only (ssr: false) because it relies on browser Audio API
- All external API calls must go through `/server/api` routes to keep API keys server-side
- Volume and play mode preferences are persisted to localStorage
- The player uses native HTML5 audio with Media Session API for OS integration (play/pause/next/prev from system controls)
