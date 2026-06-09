import { computed, ref } from 'vue'
import type { SongSearchFilters } from '@/types'

/**
 * Song-discovery filter state factory.
 *
 * The home page and the search palette each expose the same four filter inputs
 * (include/exclude artist & album) plus a "fast list" toggle that controls
 * whether heavy assets are fetched. Each call site gets its own independent set
 * of refs on purpose — filtering the home recommendations must NOT bleed into
 * the search palette and vice versa. This factory only centralises the shared
 * shape and the trim/normalise rules so they aren't duplicated.
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
