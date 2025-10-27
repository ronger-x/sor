<template>
  <div v-if="currentSong" class="w-full bg-white border-t z-50 shadow px-4 py-2">
    <div class="relative flex items-center w-full" style="min-height: 56px">
      <img :src="currentSong.cover" class="w-12 h-12 rounded mr-4" />
      <div class="flex-1 min-w-0">
        <div class="font-bold truncate">{{ currentSong.name }}</div>
        <div class="text-gray-500 text-sm truncate">{{ currentSong.artist }}</div>
      </div>
      <div
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-white px-2 rounded shadow"
        style="z-index: 20"
      >
        <UButton
          icon="i-heroicons-backward"
          variant="ghost"
          @click.stop="$emit('prev')"
          :disabled="!hasPrev"
        />
        <UButton
          :icon="playPauseIcon"
          variant="solid"
          color="primary"
          @click.stop="$emit('toggle')"
        />
        <UButton
          icon="i-heroicons-forward"
          variant="ghost"
          @click.stop="$emit('next')"
          :disabled="!hasNext"
        />
        <UButton
          icon="i-heroicons-musical-note"
          variant="ghost"
          @click.stop="$emit('show-lyrics')"
        />
      </div>
      <audio
        ref="audioRef"
        :src="currentSong.url"
        @ended="$emit('next')"
        @play="$emit('play')"
        @pause="$emit('pause')"
        style="display: none"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  currentSong: Object,
  playPauseIcon: String,
  hasPrev: Boolean,
  hasNext: Boolean
})
const emit = defineEmits(['prev', 'toggle', 'next', 'show-lyrics', 'play', 'pause'])
</script>
