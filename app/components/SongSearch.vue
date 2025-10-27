<template>
  <div class="flex flex-col md:flex-row items-center gap-4 w-full">
    <UInput
      v-model="query"
      placeholder="搜索歌曲名..."
      @keyup.enter="$emit('search', query)"
      class="flex-1"
    />
    <UButton @click="$emit('search', query)" color="primary">搜索</UButton>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  query: String
})
const emit = defineEmits(['search'])
</script>
