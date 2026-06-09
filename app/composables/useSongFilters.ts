import { computed, ref } from 'vue'
import type { SongSearchFilters } from '@/types'

/**
 * Shared song-discovery filter state.
 *
 * The home page and the search palette both expose the same four filter inputs
 * (include/exclude artist & album) plus a "fast list" toggle that controls
 * whether heavy assets are fetched. Centralising the refs + derived
 * `activeFilters`/`hasFilters` here keeps the two call sites in sync and avoids
 * duplicating the trim/normalise rules.
 */
export function useSongFilters() {
  const filterArtist = ref('')
  const filterAlbum = ref('')
  const excludeArtist = ref('')
  const excludeAlbum = ref('')
  const fastListMode = ref(false)

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

  function clearFilters() {
    filterArtist.value = ''
    filterAlbum.value = ''
    excludeArtist.value = ''
    excludeAlbum.value = ''
    fastListMode.value = false
  }

  return {
    filterArtist,
    filterAlbum,
    excludeArtist,
    excludeAlbum,
    fastListMode,
    activeFilters,
    hasFilters,
    clearFilters
  }
}
