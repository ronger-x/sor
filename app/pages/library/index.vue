<template>
  <div class="container mx-auto space-y-6">
    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-3xl font-bold">云曲库</h1>
        <p class="mt-2 text-sm text-muted">上传你自己的音频、封面和歌词，自动进入 SOR 曲库。</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton icon="i-lucide-refresh-cw" variant="soft" :loading="loading" @click="loadRecentUploads">
          最近入库
        </UButton>
        <UButton
          v-if="uploadAuthenticated"
          icon="i-lucide-log-out"
          variant="ghost"
          color="neutral"
          @click="logoutUpload"
        >
          退出上传
        </UButton>
      </div>
    </div>

    <UCard v-if="!uploadConfigured" class="card-surface border-theme">
      <div class="flex items-start gap-3">
        <UIcon name="i-lucide-shield-alert" class="mt-1 text-2xl text-warning" />
        <div class="space-y-1">
          <h2 class="text-lg font-bold">上传入口未启用</h2>
          <p class="text-sm text-muted">需要先在服务端配置上传口令，配置后才能使用云曲库上传。</p>
        </div>
      </div>
    </UCard>

    <UCard v-else-if="!uploadAuthenticated" class="card-surface border-theme">
      <div class="upload-auth">
        <div class="upload-auth-heading">
          <div class="space-y-2">
            <UIcon name="i-lucide-lock-keyhole" class="text-3xl text-primary" />
            <h2 class="text-xl font-bold">输入上传口令</h2>
            <p class="text-sm text-muted">在公众号回复“上传口令”获取临时上传卡，验证通过后当前浏览器会获得短时上传权限。</p>
          </div>
          <UButton icon="i-lucide-qr-code" variant="soft" color="primary" @click="showWechatQr">
            扫码获取
          </UButton>
        </div>

        <form class="upload-auth-form" @submit.prevent="loginUpload">
          <UInput
            v-model="uploadPassword"
            type="password"
            icon="i-lucide-key-round"
            autocomplete="current-password"
            placeholder="上传口令"
          />
          <UButton icon="i-lucide-unlock-keyhole" color="primary" :loading="authLoading" type="submit">
            解锁上传
          </UButton>
        </form>

        <p v-if="authMessage" class="text-sm text-muted">{{ authMessage }}</p>
      </div>
    </UCard>

    <UCard v-else class="card-surface border-theme">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label class="upload-zone">
          <input class="sr-only" type="file" accept="audio/*,.flac,.mp3,.wav,.m4a,.aac,.ogg" @change="onAudioChange" />
          <UIcon name="i-lucide-music" class="text-3xl" />
          <span class="font-semibold">{{ audioFile?.name || '选择音频文件' }}</span>
          <span class="text-xs text-muted">FLAC / MP3 / WAV / M4A / AAC / OGG</span>
        </label>
        <label class="upload-zone">
          <input class="sr-only" type="file" accept="image/*" @change="onCoverChange" />
          <UIcon name="i-lucide-image" class="text-3xl" />
          <span class="font-semibold">{{ coverFile?.name || '选择封面' }}</span>
          <span class="text-xs text-muted">可选，会优先使用音频内嵌封面</span>
        </label>
      </div>

      <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <UInput v-model="name" icon="i-lucide-music-2" placeholder="歌名" />
        <UInput v-model="artist" icon="i-lucide-mic-2" placeholder="歌手" />
        <UInput v-model="album" icon="i-lucide-disc-3" placeholder="专辑" />
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr]">
        <UInput v-model.number="duration" type="number" min="0" icon="i-lucide-clock" placeholder="时长秒数" />
        <textarea v-model="lyrics" class="sor-textarea" rows="6" placeholder="LRC 歌词或纯文本歌词，可留空" />
      </div>

      <div class="mt-5 flex flex-wrap items-center gap-3">
        <UButton icon="i-lucide-upload-cloud" color="primary" :loading="uploading" :disabled="!audioFile" @click="upload">
          上传入库
        </UButton>
        <UButton icon="i-lucide-rotate-ccw" variant="ghost" color="neutral" @click="resetForm">
          清空
        </UButton>
        <span v-if="uploadMessage" class="text-sm text-muted">{{ uploadMessage }}</span>
      </div>
    </UCard>

    <UModal v-model:open="wechatQrOpen" title="获取上传口令" description="关注公众号后回复“上传口令”">
      <template #content>
        <div class="wechat-qr-modal">
          <div class="wechat-qr-box">
            <img
              v-if="wechatQrUrl"
              :src="wechatQrUrl"
              :alt="`${wechatName || '公众号'} 二维码`"
              class="wechat-qr-image"
            />
            <div v-else class="wechat-qr-placeholder">
              <UIcon name="i-lucide-qr-code" class="text-5xl text-muted" />
              <p class="text-sm text-muted">公众号二维码未配置</p>
            </div>
          </div>
          <div class="space-y-2 text-center">
            <h3 v-if="wechatName" class="text-lg font-bold">{{ wechatName }}</h3>
            <p class="text-sm text-muted">扫码关注后回复“上传口令”，公众号会自动发一张临时上传卡。</p>
          </div>
          <UButton icon="i-lucide-copy" variant="outline" block @click="copyWechatKeyword">
            {{ keywordCopied ? '已复制关键词' : '复制关键词：上传口令' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <div v-if="recentSongs.length" class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <UCard v-for="song in recentSongs" :key="`recent-upload-${song.id}-${song.url}`" class="card-surface border-theme">
        <div class="flex items-center gap-3">
          <NuxtImg :src="song.cover || defaultCover" :alt="song.name" width="64" height="64" class="size-16 rounded object-cover" />
          <div class="min-w-0 flex-1">
            <h2 class="truncate font-bold">{{ song.name }}</h2>
            <p class="truncate text-sm text-muted">{{ [song.artist, song.album].filter(Boolean).join(' · ') }}</p>
          </div>
          <UButton icon="i-lucide-play" size="xs" variant="soft" @click="playSong(song)" />
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSongsStore } from '@/stores/songs'
import type { Song, SongUploadResult } from '@/types'

interface UploadSessionStatus {
  configured: boolean
  authenticated: boolean
  wechat?: {
    name?: string
    qrUrl?: string
  }
}

const songsStore = useSongsStore()
const audioFile = ref<File | null>(null)
const coverFile = ref<File | null>(null)
const name = ref('')
const artist = ref('')
const album = ref('')
const duration = ref<number | null>(null)
const lyrics = ref('')
const uploading = ref(false)
const loading = ref(false)
const authLoading = ref(false)
const uploadMessage = ref('')
const authMessage = ref('')
const uploadPassword = ref('')
const uploadConfigured = ref(false)
const uploadAuthenticated = ref(false)
const wechatQrOpen = ref(false)
const wechatName = ref('')
const wechatQrUrl = ref('')
const keywordCopied = ref(false)
const recentSongs = ref<Song[]>([])
const defaultCover = '/favicon.ico'

const fileFromEvent = (event: Event) => {
  const input = event.target as HTMLInputElement
  return input.files?.[0] || null
}

const onAudioChange = (event: Event) => {
  audioFile.value = fileFromEvent(event)
  if (audioFile.value && !name.value) {
    name.value = audioFile.value.name.replace(/\.[^.]+$/, '')
  }
}

const onCoverChange = (event: Event) => {
  coverFile.value = fileFromEvent(event)
}

const resetForm = () => {
  audioFile.value = null
  coverFile.value = null
  name.value = ''
  artist.value = ''
  album.value = ''
  duration.value = null
  lyrics.value = ''
  uploadMessage.value = ''
}

const upload = async () => {
  if (!audioFile.value) return
  uploading.value = true
  uploadMessage.value = ''
  try {
    const form = new FormData()
    form.append('audio', audioFile.value)
    if (coverFile.value) form.append('cover', coverFile.value)
    if (name.value.trim()) form.append('name', name.value.trim())
    if (artist.value.trim()) form.append('artist', artist.value.trim())
    if (album.value.trim()) form.append('album', album.value.trim())
    if (duration.value && duration.value > 0) form.append('duration', String(duration.value))
    if (lyrics.value.trim()) form.append('lyrics', lyrics.value)

    const saved = await $fetch<SongUploadResult>('/api/music/upload', {
      method: 'POST',
      body: form
    })
    uploadMessage.value = '已入库'
    const uploadedSong: Song = {
      id: saved.id,
      url: saved.url,
      lrc: saved.lrc,
      cover: saved.cover,
      name: saved.name,
      artist: saved.artist || '',
      album: saved.album || undefined,
      duration: saved.duration || undefined
    }
    recentSongs.value = [uploadedSong, ...recentSongs.value.filter(song => song.id !== saved.id)]
    resetForm()
  } catch (error: any) {
    if (error?.statusCode === 401) {
      uploadAuthenticated.value = false
    }
    uploadMessage.value = error?.data?.message || error?.message || '上传失败'
  } finally {
    uploading.value = false
  }
}

const loadUploadSession = async () => {
  try {
    const status = await $fetch<UploadSessionStatus>('/api/upload-session')
    uploadConfigured.value = status.configured
    uploadAuthenticated.value = status.authenticated
    wechatName.value = status.wechat?.name || ''
    wechatQrUrl.value = status.wechat?.qrUrl || ''
  } catch {
    uploadConfigured.value = false
    uploadAuthenticated.value = false
  }
}

const loginUpload = async () => {
  if (!uploadPassword.value.trim()) return
  authLoading.value = true
  authMessage.value = ''
  try {
    await $fetch('/api/upload-session', {
      method: 'POST',
      body: {
        password: uploadPassword.value
      }
    })
    uploadPassword.value = ''
    authMessage.value = ''
    await loadUploadSession()
  } catch (error: any) {
    authMessage.value = error?.data?.message || error?.message || '口令验证失败'
    showWechatQr()
  } finally {
    authLoading.value = false
  }
}

const showWechatQr = () => {
  keywordCopied.value = false
  wechatQrOpen.value = true
}

const copyWechatKeyword = async () => {
  try {
    await navigator.clipboard.writeText('上传口令')
    keywordCopied.value = true
  } catch {
    keywordCopied.value = false
  }
}

const logoutUpload = async () => {
  await $fetch('/api/upload-session', { method: 'DELETE' }).catch(() => undefined)
  uploadAuthenticated.value = false
  resetForm()
}

const loadRecentUploads = async () => {
  loading.value = true
  try {
    recentSongs.value = await songsStore.searchSongs('', false, undefined, undefined, 24, 0, {
      includeAssets: true
    })
  } finally {
    loading.value = false
  }
}

const playSong = async (song: Song) => {
  const index = recentSongs.value.findIndex(item => item.url === song.url)
  if (index < 0) return
  songsStore.setPlaylist('library-recent', '最近入库', recentSongs.value)
  await songsStore.playSong(index)
}

onMounted(async () => {
  await Promise.all([loadUploadSession(), loadRecentUploads()])
  if (uploadConfigured.value && !uploadAuthenticated.value) {
    showWechatQr()
  }
})
</script>

<style scoped>
.container {
  max-width: 980px;
}
.upload-zone {
  display: flex;
  min-height: 10rem;
  cursor: pointer;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  border: 1px dashed color-mix(in oklab, currentColor 24%, transparent);
  padding: 1rem;
  text-align: center;
}
.upload-zone:hover {
  background: color-mix(in oklab, currentColor 6%, transparent);
}
.upload-auth {
  display: grid;
  gap: 1.25rem;
}
.upload-auth-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
.upload-auth-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  max-width: 560px;
}
.wechat-qr-modal {
  display: grid;
  width: min(92vw, 380px);
  gap: 1rem;
  padding: 1rem;
}
.wechat-qr-box {
  display: grid;
  min-height: 15rem;
  place-items: center;
  border-radius: 0.5rem;
  border: 1px solid color-mix(in oklab, currentColor 12%, transparent);
  background: #fff;
  padding: 1rem;
}
.wechat-qr-image {
  width: min(68vw, 240px);
  height: min(68vw, 240px);
  object-fit: contain;
}
.wechat-qr-placeholder {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
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

@media (max-width: 640px) {
  .upload-auth-heading {
    display: grid;
  }
  .upload-auth-form {
    grid-template-columns: 1fr;
  }
}
</style>
