<template>
  <div @click.stop>
    <UModal v-model:open="isOpen" :title="`分享《${song?.name || '歌曲'}》`" description="生成单曲分享链接">
      <UButton
        :icon="buttonIcon"
        :size="size"
        :variant="variant"
        :color="color"
        :disabled="!song?.id"
        :aria-label="`分享 ${song?.name || '歌曲'}`"
        :title="`分享 ${song?.name || '歌曲'}`"
      >
        <slot />
      </UButton>

      <template #content>
        <div class="p-4 space-y-4 w-[min(92vw,420px)]">
          <div v-if="song" class="flex gap-3 items-center">
            <NuxtImg
              :src="song.cover || '/favicon.ico'"
              :alt="song.name"
              width="56"
              height="56"
              loading="lazy"
              class="w-14 h-14 rounded object-cover shrink-0"
            />
            <div class="min-w-0">
              <div class="font-bold truncate">{{ song.name }}</div>
              <div class="text-sm text-muted truncate">{{ song.artist || '未知歌手' }}</div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="text-sm font-medium">有效期</div>
            <div class="grid grid-cols-2 gap-2">
              <UButton
                :variant="permanent ? 'outline' : 'solid'"
                :color="permanent ? 'neutral' : 'primary'"
                block
                @click="permanent = false"
              >
                按天过期
              </UButton>
              <UButton
                :variant="permanent ? 'solid' : 'outline'"
                :color="permanent ? 'primary' : 'neutral'"
                block
                @click="permanent = true"
              >
                永久
              </UButton>
            </div>
            <UInput
              v-if="!permanent"
              v-model="expireDaysText"
              type="number"
              min="1"
              max="3650"
              placeholder="过期天数"
            >
              <template #trailing>
                <span class="text-xs text-muted">天</span>
              </template>
            </UInput>
            <p class="text-xs text-muted">
              {{ permanent ? '永久链接不会自动过期，可长期用于分享。' : '链接会在设置的天数后失效。' }}
            </p>
          </div>

          <UButton
            icon="i-lucide-link"
            color="primary"
            block
            :loading="creating"
            :disabled="!canCreate"
            @click="createShare"
          >
            生成分享链接
          </UButton>

          <UAlert
            v-if="errorMessage"
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            :description="errorMessage"
          />

          <div v-if="shareUrl" class="space-y-3">
            <div class="rounded-lg border border-default p-3 bg-muted/30 space-y-2">
              <div class="text-xs text-muted">分享链接</div>
              <div class="text-sm break-all">{{ shareUrl }}</div>
            </div>

            <div class="flex justify-center">
              <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="分享二维码" class="w-44 h-44 rounded bg-white p-2" />
            </div>

            <div v-if="expiresAtText" class="text-xs text-center text-muted">
              {{ expiresAtText }}
            </div>

            <div class="grid grid-cols-2 gap-2">
              <UButton icon="i-lucide-copy" variant="outline" block @click="copyShareUrl">
                {{ copied ? '已复制' : '复制链接' }}
              </UButton>
              <UButton icon="i-lucide-external-link" variant="outline" block :to="shareUrl" target="_blank">
                打开链接
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { renderSVG } from 'uqr'
import type { Song } from '@/types'

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type ButtonVariant = 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost' | 'link'
type ButtonColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

const props = withDefaults(
  defineProps<{
    song?: Song | null
    size?: ButtonSize
    variant?: ButtonVariant
    color?: ButtonColor
    icon?: string
  }>(),
  {
    song: null,
    size: 'sm',
    variant: 'ghost',
    color: 'neutral',
    icon: 'i-lucide-share-2'
  }
)

const isOpen = ref(false)
const permanent = ref(false)
const expireDaysText = ref('7')
const creating = ref(false)
const copied = ref(false)
const errorMessage = ref('')
const shareUrl = ref('')
const expiresAt = ref<string | null>(null)

const buttonIcon = computed(() => props.icon)
const expireDays = computed(() => Number.parseInt(expireDaysText.value, 10))
const canCreate = computed(() => {
  if (!props.song?.id || creating.value) return false
  if (permanent.value) return true
  return Number.isFinite(expireDays.value) && expireDays.value >= 1 && expireDays.value <= 3650
})

const qrCodeUrl = computed(() => {
  if (!shareUrl.value) return ''
  const svg = renderSVG(shareUrl.value, { border: 2 })
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
})

const expiresAtText = computed(() => {
  if (!shareUrl.value) return ''
  if (!expiresAt.value) return '永久有效'
  const date = new Date(expiresAt.value)
  if (Number.isNaN(date.getTime())) return ''
  return `有效期至 ${date.toLocaleString()}`
})

watch(isOpen, open => {
  if (!open) {
    copied.value = false
    errorMessage.value = ''
  }
})

async function createShare() {
  if (!props.song?.id || !canCreate.value) return

  creating.value = true
  errorMessage.value = ''
  copied.value = false

  try {
    const res = await $fetch<{
      token: string
      song_id: number
      share_url: string
      expires_at: string | null
      permanent: boolean
    }>(`/api/songs/${props.song.id}/share`, {
      method: 'POST',
      body: permanent.value
        ? { permanent: true }
        : { permanent: false, expire_days: expireDays.value }
    })
    shareUrl.value = res.share_url
    expiresAt.value = res.expires_at
  } catch (err: any) {
    errorMessage.value = err?.data?.message || err?.message || '生成分享链接失败'
  } finally {
    creating.value = false
  }
}

async function copyShareUrl() {
  if (!shareUrl.value) return
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
  } catch {
    errorMessage.value = '复制失败，请手动复制链接'
  }
}
</script>
