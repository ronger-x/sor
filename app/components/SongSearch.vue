<template>
  <div class="flex flex-col md:flex-row items-center gap-4 w-full">
    <UInput
      v-model="query"
      placeholder="搜索歌曲名..."
      :class="['flex-1']"
      @keyup.enter="search"
      :ui="{ trailing: 'pe-1' }"
    >
      <template v-if="query?.length" #trailing>
        <UButton
          color="neutral"
          variant="link"
          size="sm"
          icon="i-lucide-circle-x"
          aria-label="清除输入"
          @click="query = ''"
        />
      </template>
    </UInput>
    <div class="flex items-center gap-2">
      <UButton @click="search" color="primary">搜索</UButton>
      <UColorModeSelect />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSongsStore } from '@/stores/songs'

const songsStore = useSongsStore()
const query = ref('')
const router = useRouter()

const search = async () => {
  // 仅在歌词界面时关闭弹窗并跳转首页
  if (songsStore.lyricsModal) {
    songsStore.lyricsModal = false
    router.push('/')
  }
  await songsStore.searchSongs(query.value)
}
</script>
