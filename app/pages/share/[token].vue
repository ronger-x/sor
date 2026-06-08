<template>
  <div class="share-page min-h-[70vh] w-full">
    <div v-if="pending" class="flex items-center justify-center min-h-[50vh]">
      <div class="text-center space-y-3">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl" />
        <p class="text-sm text-muted">加载分享歌曲中...</p>
      </div>
    </div>

    <UEmpty
      v-else-if="loadError || !shareDetail?.song"
      icon="i-lucide-link-2-off"
      title="分享链接不可用"
      description="链接可能已过期、被删除，或歌曲不存在。"
    >
      <template #actions>
        <UButton to="/" icon="i-lucide-house">返回首页</UButton>
      </template>
    </UEmpty>

    <div v-else class="share-shell" :style="sharePageStyle">
      <section class="share-card-wrap" aria-label="歌曲分享卡片">
        <div class="share-card">
          <div class="share-card__cover">
            <img
              v-if="hasCover"
              :src="sharedSong?.cover || ''"
              :alt="shareDetail.song.name"
              width="132"
              height="132"
              loading="eager"
              decoding="async"
              class="h-full w-full object-cover"
              @error="coverLoadFailed = true"
            />
            <div v-else class="share-card__cover-fallback" aria-hidden="true">S</div>
          </div>

          <div class="share-card__content">
            <div class="share-card__eyebrow">
              <span class="share-card__brand">S.O.R Music</span>
              <span>{{ expiryText }}</span>
            </div>
            <h1>{{ shareDetail.song.name }}</h1>
            <p>{{ shareSubtitle }}</p>
            <div class="share-card__source">
              <span class="share-card__source-icon">S</span>
              <span>来自某科学的人的音乐库</span>
            </div>
          </div>

          <UButton
            class="share-card__play"
            icon="i-lucide-play"
            color="primary"
            size="xl"
            :aria-label="`播放 ${shareDetail.song.name}`"
            @click="playSharedSong"
          />
        </div>

        <div class="share-actions">
          <UButton icon="i-lucide-play" color="primary" @click="playSharedSong">播放</UButton>
          <UButton icon="i-lucide-copy" variant="outline" @click="copyCurrentUrl">
            {{ copied ? '已复制' : '复制链接' }}
          </UButton>
          <UButton icon="i-lucide-house" variant="outline" to="/">首页</UButton>
        </div>
      </section>

      <section class="share-lyric-stage" aria-label="视觉歌词">
        <LyricViewer
          embedded
          :redirect-on-empty="false"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSongsStore } from '@/stores/songs'
import type { Song } from '@/types'

interface ShareSong {
  id: number
  name: string
  artist?: string
  album?: string
  duration?: number
  cover?: string | null
  lrc?: string | null
  url: string
}

interface ShareDetail {
  token: string
  expires_at?: string | null
  permanent: boolean
  song: ShareSong
}

const route = useRoute()
const songsStore = useSongsStore()
const token = computed(() => String(route.params.token || ''))
const copied = ref(false)
const coverLoadFailed = ref(false)
const defaultCover = '/favicon.ico'

const {
  data: shareDetail,
  pending,
  error: loadError
} = await useFetch<ShareDetail>(() => `/api/share/${encodeURIComponent(token.value)}`, {
  watch: [token]
})

const sharedSong = computed<Song | null>(() => {
  const song = shareDetail.value?.song
  if (!song) return null
  return {
    id: song.id,
    name: song.name,
    artist: song.artist || '未知歌手',
    album: song.album,
    duration: song.duration,
    cover: song.cover || defaultCover,
    lrc: song.lrc || null,
    url: song.url
  }
})

const pageTitle = computed(() => {
  const song = shareDetail.value?.song
  return song ? `${song.name} - ${song.artist || '未知歌手'} | S.O.R Music 分享` : 'S.O.R Music 分享'
})

const shareSubtitle = computed(() => {
  const song = shareDetail.value?.song
  if (!song) return '未知歌手'
  return [song.artist || '未知歌手', song.album].filter(Boolean).join(' · ')
})

const sharePageStyle = computed<Record<string, string>>(() => ({
  '--share-cover-image': `url(${JSON.stringify(sharedSong.value?.cover || defaultCover)})`
}))

const hasCover = computed(() => Boolean(shareDetail.value?.song?.cover && !coverLoadFailed.value))

useSeoMeta({
  title: pageTitle,
  ogTitle: pageTitle,
  description: () => `来自 S.O.R Music 的单曲分享：${shareSubtitle.value}`,
  ogDescription: () => `来自 S.O.R Music 的单曲分享：${shareSubtitle.value}`,
  ogImage: () => shareDetail.value?.song?.cover || defaultCover,
  ogType: 'music.song',
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: () => `来自 S.O.R Music 的单曲分享：${shareSubtitle.value}`,
  twitterImage: () => shareDetail.value?.song?.cover || defaultCover
})

const expiryText = computed(() => {
  if (!shareDetail.value) return ''
  if (shareDetail.value.permanent || !shareDetail.value.expires_at) return '永久有效'
  const expires = new Date(shareDetail.value.expires_at)
  if (Number.isNaN(expires.getTime())) return ''
  return `有效期至 ${expires.toLocaleString()}`
})

let sharePlayRun = 0

watch(
  sharedSong,
  song => {
    if (!song) return
    coverLoadFailed.value = false
    queueSharedSong(song, true)
  },
  { immediate: true }
)

function queueSharedSong(song: Song, autoPlay: boolean) {
  const run = ++sharePlayRun

  songsStore.setPlaylist(`share-${token.value}`, '分享歌曲', [song])
  songsStore.currentSong = song
  songsStore.currentIndex = 0
  void songsStore.showCurrentLyrics()

  if (!autoPlay || !import.meta.client) return

  const playWhenAudioReady = (attempt = 0) => {
    if (run !== sharePlayRun) return
    if (songsStore.getAudio()) {
      void songsStore.playSong(0)
      return
    }
    if (attempt < 20) {
      window.setTimeout(() => playWhenAudioReady(attempt + 1), 50)
    }
  }

  window.requestAnimationFrame(() => playWhenAudioReady())
}

async function playSharedSong() {
  const song = sharedSong.value
  if (!song) return
  queueSharedSong(song, false)
  await songsStore.playSong(0)
}

async function copyCurrentUrl() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
  } catch {
    copied.value = false
  }
}
</script>

<style scoped>
.share-shell {
  position: relative;
  display: flex;
  min-height: calc(100dvh - 9rem);
  width: min(1180px, 100%);
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
  border-radius: 0.875rem;
}

.share-shell::before {
  content: '';
  position: absolute;
  inset: -14%;
  z-index: -2;
  background-image: var(--share-cover-image);
  background-position: center;
  background-size: cover;
  filter: blur(52px) saturate(1.2);
  opacity: 0.24;
  transform: scale(1.08);
}

.share-shell::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 0.92), rgb(255 255 255 / 0.72) 32%, rgb(255 255 255 / 0.9)),
    radial-gradient(circle at 18% 12%, rgb(0 193 106 / 0.18), transparent 34%);
  pointer-events: none;
}

.share-card-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1rem 0;
}

.share-card {
  display: grid;
  width: min(620px, 100%);
  min-height: 9rem;
  grid-template-columns: 7.25rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  border: 1px solid rgb(15 23 42 / 0.08);
  border-radius: 0.75rem;
  background:
    linear-gradient(135deg, rgb(255 255 255 / 0.96), rgb(248 250 252 / 0.9)),
    Canvas;
  box-shadow: 0 18px 48px rgb(15 23 42 / 0.14);
  padding: 0.875rem;
}

.share-card__cover {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 0.5rem;
  background:
    linear-gradient(135deg, rgb(0 193 106 / 0.18), rgb(15 23 42 / 0.08)),
    rgb(248 250 252);
  box-shadow: 0 10px 24px rgb(15 23 42 / 0.18);
}

.share-card__cover-fallback {
  display: flex;
  width: 4.5rem;
  height: 4.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background: rgb(0 193 106);
  color: white;
  font-size: 2.2rem;
  font-weight: 900;
  line-height: 1;
}

.share-card__content {
  min-width: 0;
}

.share-card__eyebrow {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  color: rgb(71 85 105);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.4;
}

.share-card__brand {
  color: rgb(0 161 85);
}

.share-card h1 {
  margin: 0.3rem 0 0;
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-size: clamp(1.25rem, 2vw, 1.75rem);
  font-weight: 800;
  line-height: 1.18;
}

.share-card p {
  margin: 0.45rem 0 0;
  overflow: hidden;
  color: rgb(51 65 85);
  font-size: 0.95rem;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share-card__source {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.8rem;
  color: rgb(100 116 139);
  font-size: 0.78rem;
  font-weight: 700;
}

.share-card__source-icon {
  display: inline-flex;
  width: 1.35rem;
  height: 1.35rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  background: rgb(0 193 106);
  color: white;
  font-size: 0.75rem;
}

.share-card__play {
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
}

.share-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.share-lyric-stage {
  display: flex;
  min-height: 540px;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgb(15 23 42 / 0.08);
  border-radius: 0.75rem;
  margin: 0 1rem 1rem;
  box-shadow: 0 18px 54px rgb(15 23 42 / 0.12);
}

.share-lyric-stage :deep(.lyric-viewer) {
  flex: 1;
  min-height: 0;
}

@media (max-width: 768px) {
  .share-shell {
    border-radius: 0;
  }

  .share-card-wrap {
    align-items: stretch;
    flex-direction: column;
    padding: 0.75rem 0.75rem 0;
  }

  .share-card {
    grid-template-columns: 5.5rem minmax(0, 1fr);
    gap: 0.75rem;
    min-height: 7.25rem;
    padding: 0.75rem;
  }

  .share-card__play {
    grid-column: 1 / -1;
    width: 100%;
    height: 2.75rem;
  }

  .share-actions {
    justify-content: stretch;
  }

  .share-actions :deep(button),
  .share-actions :deep(a) {
    flex: 1;
  }

  .share-lyric-stage {
    min-height: calc(100dvh - 19rem);
    margin: 0 0.75rem 0.75rem;
  }
}
</style>
