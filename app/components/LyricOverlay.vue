<template>
  <Teleport to="body">
    <Transition name="lyric-overlay">
      <div v-if="isOpen" class="lyric-overlay" role="dialog" aria-modal="true" aria-label="歌词面板">
        <button
          class="lyric-overlay__scrim"
          type="button"
          aria-label="关闭歌词面板"
          @click="close"
        />

        <section
          ref="sheetRef"
          class="lyric-overlay__sheet"
          :class="{ 'lyric-overlay__sheet--dragging': isDragging }"
          :style="sheetStyle"
        >
          <header class="lyric-overlay__header" @pointerdown="startDrag">
            <div class="min-w-0">
              <p class="lyric-overlay__eyebrow">正在播放</p>
              <h2 class="truncate text-base font-bold md:text-lg">
                {{ currentSong?.name || '还没有播放歌曲' }}
              </h2>
              <p class="truncate text-xs text-muted md:text-sm">
                {{ [currentSong?.artist, currentSong?.album].filter(Boolean).join(' · ') || '从曲库选择一首歌' }}
              </p>
            </div>

            <div class="lyric-overlay__actions">
              <UButton
                icon="i-lucide-crosshair"
                color="neutral"
                variant="ghost"
                aria-label="回到居中"
                title="回到居中"
                @click="resetPosition"
              />

              <div class="lyric-overlay__modes" role="group" aria-label="歌词显示模式">
                <button
                  v-for="mode in modes"
                  :key="mode.value"
                  type="button"
                  class="lyric-overlay__mode"
                  :class="{ 'lyric-overlay__mode--active': lyricMode === mode.value }"
                  :aria-pressed="lyricMode === mode.value"
                  :title="mode.label"
                  @click="setMode(mode.value)"
                >
                  <UIcon :name="mode.icon" class="size-4" />
                  <span>{{ mode.label }}</span>
                </button>
              </div>

              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                aria-label="关闭歌词面板"
                title="关闭歌词面板"
                @click="close"
              />
            </div>
          </header>

          <div class="lyric-overlay__body">
            <LyricViewer
              :mode="lyricMode"
              embedded
              :redirect-on-empty="false"
            />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useSongsStore } from '@/stores/songs'
import type { LyricViewMode } from '@/types'

const songsStore = useSongsStore()
const currentSong = computed(() => songsStore.currentSong)
const isOpen = computed(() => songsStore.lyricsPanelOpen)
const lyricMode = computed(() => songsStore.lyricViewMode)
const sheetRef = ref<HTMLElement | null>(null)
const dragX = ref(0)
const dragY = ref(0)
const isDragging = ref(false)

let dragStartX = 0
let dragStartY = 0
let dragOriginX = 0
let dragOriginY = 0
let activePointerId: number | null = null
let hasMovedPastDragThreshold = false

const modes: Array<{ value: LyricViewMode; label: string; icon: string }> = [
  { value: 'vinyl', label: '唱片', icon: 'i-lucide-disc-3' },
  { value: 'focus', label: '沉浸', icon: 'i-lucide-align-center' },
  { value: 'compact', label: '紧凑', icon: 'i-lucide-list-music' }
]

function setMode(mode: LyricViewMode) {
  songsStore.setLyricViewMode(mode)
}

function close() {
  songsStore.closeLyricsPanel()
}

const sheetStyle = computed(() => ({
  '--lyric-overlay-x': `${dragX.value}px`,
  '--lyric-overlay-y': `${dragY.value}px`
}))

function startDrag(event: PointerEvent) {
  if (!import.meta.client || event.button !== 0) return
  if (event.pointerType === 'touch' && window.innerWidth <= 768) return

  const target = event.target
  if (
    target instanceof Element &&
    target.closest('button, a, input, textarea, select, [role="button"]')
  ) {
    return
  }

  activePointerId = event.pointerId
  dragStartX = event.clientX
  dragStartY = event.clientY
  dragOriginX = dragX.value
  dragOriginY = dragY.value
  hasMovedPastDragThreshold = false
  isDragging.value = true
  sheetRef.value?.setPointerCapture(event.pointerId)
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', stopDrag)
  window.addEventListener('pointercancel', stopDrag)
}

function onDragMove(event: PointerEvent) {
  if (!isDragging.value || activePointerId !== event.pointerId) return

  const deltaX = event.clientX - dragStartX
  const deltaY = event.clientY - dragStartY
  if (!hasMovedPastDragThreshold && Math.hypot(deltaX, deltaY) < 4) return

  hasMovedPastDragThreshold = true
  dragX.value = dragOriginX + event.clientX - dragStartX
  dragY.value = dragOriginY + event.clientY - dragStartY
}

function stopDrag(event?: PointerEvent) {
  if (event && activePointerId !== event.pointerId) return
  if (event && sheetRef.value?.hasPointerCapture(event.pointerId)) {
    sheetRef.value.releasePointerCapture(event.pointerId)
  }

  activePointerId = null
  hasMovedPastDragThreshold = false
  isDragging.value = false
  clampPosition()
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
}

function resetPosition() {
  dragX.value = 0
  dragY.value = 0
}

function clampPosition() {
  if (!import.meta.client || !sheetRef.value) return

  const rect = sheetRef.value.getBoundingClientRect()
  const margin = 24
  const overflowLeft = margin - rect.left
  const overflowRight = rect.right - (window.innerWidth - margin)
  const overflowTop = margin - rect.top
  const overflowBottom = rect.bottom - (window.innerHeight - margin)

  if (overflowLeft > 0) dragX.value += overflowLeft
  if (overflowRight > 0) dragX.value -= overflowRight
  if (overflowTop > 0) dragY.value += overflowTop
  if (overflowBottom > 0) dragY.value -= overflowBottom
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(
  isOpen,
  open => {
    if (!import.meta.client) return
    document.body.classList.toggle('lyric-overlay-open', open)
    if (open) {
      resetPosition()
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
      stopDrag()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.body.classList.remove('lyric-overlay-open')
  window.removeEventListener('keydown', onKeydown)
  stopDrag()
})
</script>

<style scoped>
.lyric-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.lyric-overlay__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background:
    linear-gradient(180deg, rgba(10, 16, 22, 0.42), rgba(10, 16, 22, 0.72)),
    color-mix(in oklab, Canvas 40%, transparent);
  backdrop-filter: blur(14px);
  cursor: default;
}

.lyric-overlay__sheet {
  position: relative;
  display: flex;
  width: min(1180px, calc(100vw - 2rem));
  height: min(820px, calc(100dvh - 7.75rem));
  min-height: 520px;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, currentColor 14%, transparent);
  border-radius: 0.75rem;
  background:
    linear-gradient(135deg, color-mix(in oklab, Canvas 94%, transparent), color-mix(in oklab, Canvas 88%, black 8%)),
    Canvas;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.32);
  transform: translate3d(var(--lyric-overlay-x, 0), var(--lyric-overlay-y, 0), 0);
  will-change: transform;
}

.lyric-overlay__sheet--dragging {
  cursor: grabbing;
  transition: none !important;
  user-select: none;
}

.lyric-overlay__header {
  display: flex;
  min-height: 72px;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid color-mix(in oklab, currentColor 10%, transparent);
  cursor: grab;
  padding: 0.85rem 1rem;
  touch-action: none;
}

.lyric-overlay__header:active {
  cursor: grabbing;
}

.lyric-overlay__eyebrow {
  margin-bottom: 0.15rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
  color: color-mix(in oklab, currentColor 58%, transparent);
}

.lyric-overlay__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.5rem;
}

.lyric-overlay__modes {
  display: inline-grid;
  grid-template-columns: repeat(3, minmax(4.25rem, 1fr));
  gap: 0.25rem;
  border-radius: 0.5rem;
  background: color-mix(in oklab, currentColor 8%, transparent);
  padding: 0.25rem;
}

.lyric-overlay__mode {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  color: color-mix(in oklab, currentColor 70%, transparent);
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1;
  padding: 0 0.65rem;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.lyric-overlay__mode:hover,
.lyric-overlay__mode:focus-visible {
  color: currentColor;
}

.lyric-overlay__mode:focus-visible {
  outline: 2px solid color-mix(in oklab, currentColor 44%, transparent);
  outline-offset: 2px;
}

.lyric-overlay__mode--active {
  background: Canvas;
  color: currentColor;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.12);
}

.lyric-overlay__body {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.lyric-overlay-enter-active,
.lyric-overlay-leave-active {
  transition: opacity 180ms ease;
}

.lyric-overlay-enter-active .lyric-overlay__sheet,
.lyric-overlay-leave-active .lyric-overlay__sheet {
  transition: transform 220ms ease, opacity 180ms ease;
}

.lyric-overlay-enter-from,
.lyric-overlay-leave-to {
  opacity: 0;
}

.lyric-overlay-enter-from .lyric-overlay__sheet,
.lyric-overlay-leave-to .lyric-overlay__sheet {
  opacity: 0;
  transform: translate3d(var(--lyric-overlay-x, 0), calc(var(--lyric-overlay-y, 0) + 1rem), 0) scale(0.98);
}

@media (max-width: 768px) {
  .lyric-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .lyric-overlay__sheet {
    width: 100vw;
    height: calc(100dvh - 4.75rem);
    min-height: 0;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 0.875rem 0.875rem 0 0;
    transform: none !important;
  }

  .lyric-overlay__header {
    min-height: 104px;
    align-items: stretch;
    flex-direction: column;
    gap: 0.65rem;
    cursor: default;
    padding: 0.85rem 0.85rem 0.75rem;
    touch-action: auto;
  }

  .lyric-overlay__actions {
    width: 100%;
    justify-content: space-between;
  }

  .lyric-overlay__modes {
    flex: 1;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .lyric-overlay__mode {
    min-width: 0;
    padding: 0 0.35rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lyric-overlay-enter-active,
  .lyric-overlay-leave-active,
  .lyric-overlay-enter-active .lyric-overlay__sheet,
  .lyric-overlay-leave-active .lyric-overlay__sheet {
    transition: none;
  }
}
</style>
