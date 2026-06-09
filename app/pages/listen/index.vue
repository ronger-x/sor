<template>
  <div class="container mx-auto space-y-6">
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <UCard class="card-surface border-theme overflow-hidden">
        <div class="listen-stage">
          <div class="cover-shell">
            <NuxtImg
              :src="currentSong?.cover || defaultCover"
              :alt="currentSong?.name || '当前歌曲'"
              width="360"
              height="360"
              loading="eager"
              class="cover-art"
            />
          </div>
          <div class="min-w-0 space-y-4">
            <div>
              <UBadge color="primary" variant="soft" icon="i-lucide-radio">
                当前播放
              </UBadge>
              <h1 class="mt-3 truncate text-3xl font-bold">
                {{ currentSong?.name || '还没有播放歌曲' }}
              </h1>
              <p class="mt-1 truncate text-sm text-muted">
                {{ [currentSong?.artist, currentSong?.album].filter(Boolean).join(' · ') || '从首页或搜索选择一首歌' }}
              </p>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <UButton icon="i-lucide-heart" variant="soft" :disabled="!currentSong" @click="toggleLike">
                喜欢
              </UButton>
              <UButton icon="i-lucide-ban" variant="soft" color="neutral" :disabled="!currentSong" @click="dislike">
                不想听
              </UButton>
              <UButton icon="i-lucide-clapperboard" variant="soft" :disabled="!currentSong" @click="openLyrics">
                视觉歌词
              </UButton>
            </div>

            <div v-if="currentSong" class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold">相似推荐</span>
                <UButton icon="i-lucide-refresh-cw" size="xs" variant="ghost" @click="loadSimilar" />
              </div>
              <div class="space-y-2">
                <button
                  v-for="song in similarSongs.slice(0, 6)"
                  :key="`similar-${song.id}-${song.url}`"
                  class="listen-row"
                  type="button"
                  @click="playSimilar(song)"
                >
                  <span class="truncate">{{ song.name }}</span>
                  <span class="truncate text-muted">{{ song.artist }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <div class="space-y-5">
        <UCard class="card-surface border-theme">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold">评论</h2>
              <p class="text-xs text-muted">按同步 ID 记录到你的私有曲库</p>
            </div>
            <UButton icon="i-lucide-refresh-cw" size="xs" variant="ghost" :disabled="!currentSong" @click="loadComments" />
          </div>
          <div class="mt-3 space-y-3">
            <UInput v-model="nickname" size="sm" icon="i-lucide-user" placeholder="昵称" />
            <textarea v-model="commentBody" class="sor-textarea" rows="3" placeholder="写一条评论" />
            <UButton icon="i-lucide-send" size="sm" :disabled="!currentSong || !commentBody.trim()" @click="postComment">
              发送
            </UButton>
          </div>
          <div class="mt-4 space-y-3">
            <div v-for="comment in comments" :key="comment.id" class="comment-item">
              <div class="flex items-center justify-between gap-2">
                <span class="truncate text-sm font-semibold">{{ comment.nickname || '匿名' }}</span>
                <span class="shrink-0 text-xs text-muted">{{ formatDate(comment.created_at) }}</span>
              </div>
              <p class="mt-1 whitespace-pre-wrap text-sm">{{ comment.body }}</p>
            </div>
            <UEmpty v-if="currentSong && !comments.length" icon="i-lucide-message-circle" title="暂无评论" />
          </div>
        </UCard>

        <UCard class="card-surface border-theme">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold">歌词辅助</h2>
              <p class="text-xs text-muted">保存翻译、校对备注或逐字歌词说明</p>
            </div>
            <UButton icon="i-lucide-refresh-cw" size="xs" variant="ghost" :disabled="!currentSong" @click="loadLyricAssist" />
          </div>
          <div class="mt-3 space-y-3">
            <textarea v-model="lyricAssistText" class="sor-textarea" rows="7" placeholder="翻译 / 逐字歌词 / 校对备注" />
            <UButton icon="i-lucide-save" size="sm" :disabled="!currentSong" @click="saveLyricAssist">
              保存歌词辅助
            </UButton>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useSongsStore } from '@/stores/songs'
import { useMusicPreferencesStore } from '@/stores/preferences'
import type { LyricAssist, Song, SongComment } from '@/types'

const songsStore = useSongsStore()
const preferencesStore = useMusicPreferencesStore()
const currentSong = computed(() => songsStore.currentSong)
const similarSongs = ref<Song[]>([])
const comments = ref<SongComment[]>([])
const nickname = ref(preferencesStore.displayName || '')
const commentBody = ref('')
const lyricAssistText = ref('')
const defaultCover = '/favicon.ico'

const loadSimilar = async () => {
  if (!currentSong.value?.id) {
    similarSongs.value = []
    return
  }
  similarSongs.value = await songsStore.similar(currentSong.value.id, 24)
}

const loadComments = async () => {
  if (!currentSong.value?.id) {
    comments.value = []
    return
  }
  comments.value = await $fetch<SongComment[]>(`/api/music/${currentSong.value.id}/comments`, {
    params: { limit: 50 }
  })
}

const postComment = async () => {
  if (!currentSong.value?.id || !commentBody.value.trim()) return
  const saved = await $fetch<SongComment>(`/api/music/${currentSong.value.id}/comments`, {
    method: 'POST',
    body: {
      profile_id: preferencesStore.profileId,
      nickname: nickname.value || preferencesStore.displayName || undefined,
      body: commentBody.value.trim()
    }
  })
  comments.value.unshift(saved)
  commentBody.value = ''
  if (nickname.value && preferencesStore.displayName !== nickname.value) {
    preferencesStore.displayName = nickname.value
  }
}

const loadLyricAssist = async () => {
  if (!currentSong.value?.id) {
    lyricAssistText.value = ''
    return
  }
  const assist = await $fetch<LyricAssist>(`/api/music/${currentSong.value.id}/lyric-assist`)
  lyricAssistText.value = assist.translation || ''
}

const saveLyricAssist = async () => {
  if (!currentSong.value?.id) return
  await $fetch<LyricAssist>(`/api/music/${currentSong.value.id}/lyric-assist`, {
    method: 'PUT',
    body: {
      profile_id: preferencesStore.profileId,
      translation: lyricAssistText.value
    }
  })
}

const playSimilar = async (song: Song) => {
  const index = similarSongs.value.findIndex(item => item.url === song.url)
  if (index < 0) return
  songsStore.setPlaylist(`similar-${currentSong.value?.id}`, '相似推荐', similarSongs.value)
  await songsStore.playSong(index)
}

const toggleLike = () => {
  preferencesStore.toggleLikedSong(currentSong.value)
}

const dislike = () => {
  songsStore.dislikeSong(currentSong.value)
}

const openLyrics = () => {
  void songsStore.openLyricsPanel('vinyl')
}

const formatDate = (value?: string | null) => {
  if (!value) return ''
  return new Date(value).toLocaleString()
}

watch(
  currentSong,
  async () => {
    await Promise.all([loadSimilar(), loadComments(), loadLyricAssist()])
  },
  { immediate: true }
)

onMounted(() => {
  preferencesStore.hydrate()
})
</script>

<style scoped>
.container {
  max-width: 1180px;
}
.listen-stage {
  display: grid;
  grid-template-columns: minmax(220px, 360px) minmax(0, 1fr);
  gap: 2rem;
  align-items: center;
}
.cover-shell {
  aspect-ratio: 1;
  border-radius: 0.5rem;
  overflow: hidden;
  background: color-mix(in oklab, currentColor 8%, transparent);
}
.cover-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.listen-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr);
  gap: 0.75rem;
  width: 100%;
  border-radius: 0.375rem;
  padding: 0.5rem 0.625rem;
  text-align: left;
}
.listen-row:hover,
.comment-item:hover {
  background: color-mix(in oklab, currentColor 8%, transparent);
}
.comment-item {
  border-radius: 0.375rem;
  padding: 0.625rem;
}
.sor-textarea {
  width: 100%;
  resize: vertical;
  border-radius: 0.375rem;
  border: 1px solid color-mix(in oklab, currentColor 16%, transparent);
  background: transparent;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5;
  outline: none;
}
.sor-textarea:focus {
  border-color: var(--ui-primary);
}
@media (max-width: 767px) {
  .listen-stage {
    grid-template-columns: 1fr;
  }
}
</style>
