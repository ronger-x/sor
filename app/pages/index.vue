<template>
  <div class="container mx-auto py-8">
    <UCard>
      <div class="flex flex-col md:flex-row items-center gap-4">
        <UInput
          v-model="query"
          placeholder="搜索歌曲名..."
          @keyup.enter="searchSongs"
          class="flex-1"
        />
        <UButton @click="searchSongs" color="primary">搜索</UButton>
      </div>
    </UCard>

    <div v-if="loading" class="text-center py-8">
      <ULoading />
    </div>

    <div v-if="songs.length" class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      <UCard
        v-for="(song, idx) in songs"
        :key="song.url"
        class="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition text-center"
        @click="playSong(idx)"
      >
        <img
          :src="song.cover"
          :alt="song.name"
          class="w-32 h-32 object-cover rounded mb-4 mx-auto"
        />
        <div class="font-bold text-lg w-full">{{ song.name }}</div>
        <div class="text-gray-500 mb-2 w-full">{{ song.artist }}</div>
      </UCard>
    </div>

    <USlideover
      v-model:open="lyricsModal"
      side="bottom"
      :overlay="true"
      :ui="{
        content: 'inset-0 h-full max-h-full bg-white flex flex-col z-[100]',
      }"
      title="歌词"
    >
      <template #body>
        <div
          v-if="lyricsLoading"
          class="flex-1 flex items-center justify-center"
        >
          <ULoading />
        </div>
        <div
          v-else
          class="flex-1 flex flex-col items-stretch justify-start overflow-y-auto px-2 w-full"
        >
          <LyricViewer
            v-if="parsedLyrics.length"
            :lyrics="parsedLyrics"
            :audioRef="audioRef"
            v-model:currentLine="currentLyricLine"
            @seek="seekTo"
          />
          <template v-if="!parsedLyrics.length">
            <pre class="whitespace-pre-wrap text-center">{{ lyrics }}</pre>
          </template>
        </div>
      </template>
    </USlideover>

    <!-- 底部播放器 -->
    <div
      v-if="currentSong"
      class="fixed bottom-0 left-0 w-full bg-white border-t z-50 shadow px-4 py-2"
    >
      <div class="relative flex items-center w-full" style="min-height: 56px">
        <img :src="currentSong.cover" class="w-12 h-12 rounded mr-4" />
        <div class="flex-1 min-w-0">
          <div class="font-bold truncate">{{ currentSong.name }}</div>
          <div class="text-gray-500 text-sm truncate">
            {{ currentSong.artist }}
          </div>
        </div>
        <!-- 播放器按钮区域绝对居中 -->
        <div
          class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-white px-2 rounded shadow"
          style="z-index: 20"
        >
          <UButton
            icon="i-heroicons-backward"
            variant="ghost"
            @click.stop="prevSong"
            :disabled="!hasPrev"
          />
          <UButton
            :icon="playPauseIcon"
            variant="solid"
            color="primary"
            @click.stop="togglePlay"
          />
          <UButton
            icon="i-heroicons-forward"
            variant="ghost"
            @click.stop="nextSong"
            :disabled="!hasNext"
          />
          <UButton
            icon="i-heroicons-musical-note"
            variant="ghost"
            @click.stop="showCurrentLyrics"
          />
        </div>
      </div>
      <audio
        ref="audioRef"
        :src="currentSong.url"
        @ended="nextSong"
        @play="onAudioPlay"
        @pause="onAudioPause"
        style="display: none"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, watch } from "vue";
const config = useRuntimeConfig();

const query = ref("");
const songs = ref<any[]>([]);
const loading = ref(false);

const lyricsModal = ref(false);
const lyrics = ref("");
const lyricsLoading = ref(false);
const parsedLyrics = ref<{ time: number; text: string }[]>([]);
const currentLyricLine = ref(0);

const currentIndex = ref(-1);
const currentSong = computed(() => songs.value[currentIndex.value] || null);
const audioRef = ref<HTMLAudioElement | null>(null);

const isPlaying = ref(false); // 新增参数
const playPauseIcon = computed(() =>
  isPlaying.value ? "i-heroicons-pause" : "i-heroicons-play"
);

const hasPrev = computed(() => currentIndex.value > 0);
const hasNext = computed(
  () => currentIndex.value < songs.value.length - 1 && currentIndex.value !== -1
);

onMounted(() => {
  fetchDefaultSongs();
});

async function fetchDefaultSongs() {
  loading.value = true;
  try {
    const res = await $fetch("https://music.czx.me:6/songs", {
      params: {
        random: true,
        limit: 50,
      },
      headers: { "X-API-KEY": config.public.musicApiKey },
    });
    songs.value = res as any[];
  } catch (e) {
    songs.value = [];
  } finally {
    loading.value = false;
  }
}

async function searchSongs() {
  if (!query.value) {
    fetchDefaultSongs();
    return;
  }
  loading.value = true;
  try {
    const res = await $fetch("https://music.czx.me:6/songs", {
      params: { q: query.value, limit: 50 },
      headers: { "X-API-KEY": config.public.musicApiKey },
    });
    songs.value = res as any[];
  } catch (e) {
    songs.value = [];
  } finally {
    loading.value = false;
  }
}

async function playSong(idx: number) {
  currentIndex.value = idx;
  await nextTick();
  const audio = audioRef.value;
  if (!audio) return;

  // Pause any current playback and ensure src matches selected song
  try {
    audio.pause();
  } catch {}

  if (currentSong.value && audio.src !== currentSong.value.url) {
    audio.src = currentSong.value.url;
  }

  // Wait until the audio element can play the new source
  await new Promise<void>((resolve) => {
    if (audio.readyState >= 3) return resolve(); // HAVE_FUTURE_DATA / HAVE_ENOUGH_DATA
    const onCanPlay = () => {
      audio.removeEventListener("canplay", onCanPlay);
      resolve();
    };
    audio.addEventListener("canplay", onCanPlay);
    // trigger load in case it's needed
    try {
      audio.load();
    } catch {}
  });

  try {
    // optimistically update UI so user sees immediate feedback
    isPlaying.value = true;
    await audio.play();
  } catch (err) {
    // play may fail due to autoplay policies; keep state consistent
    isPlaying.value = false;
    console.warn("audio play failed", err);
  }
}

async function togglePlay() {
  if (!audioRef.value) return;
  if (isPlaying.value) {
    // currently playing -> pause
    audioRef.value.pause();
    isPlaying.value = false;
  } else {
    // currently paused -> try to play and update state after success
    try {
      await audioRef.value.play();
      isPlaying.value = true;
    } catch (err) {
      console.warn("audio play failed", err);
      isPlaying.value = false;
    }
  }
}

function prevSong() {
  if (hasPrev.value) {
    playSong(currentIndex.value - 1);
  }
}

function nextSong() {
  if (hasNext.value) {
    playSong(currentIndex.value + 1);
  }
}

function onAudioPlay() {
  isPlaying.value = true;
}
function onAudioPause() {
  isPlaying.value = false;
}

async function showCurrentLyrics() {
  if (!currentSong.value) return;
  lyricsModal.value = true;
  lyrics.value = "";
  lyricsLoading.value = true;
  parsedLyrics.value = [];
  currentLyricLine.value = 0;
  try {
    const lrc = await $fetch(currentSong.value.lrc);
    lyrics.value = lrc as string;
    parsedLyrics.value = parseLRC(lyrics.value);
  } catch (e) {
    lyrics.value = "歌词加载失败";
  } finally {
    lyricsLoading.value = false;
  }
}

function seekTo(timeMs: number) {
  if (!audioRef.value) return;
  try {
    audioRef.value.currentTime = timeMs / 1000;
    audioRef.value.play().catch(() => {});
    isPlaying.value = true;
  } catch (e) {
    console.warn("seek failed", e);
  }
}

function parseLRC(lrc: string) {
  const lines = lrc.split(/\r?\n/);
  const result: { time: number; text: string }[] = [];
  const timeReg = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  for (const line of lines) {
    let match;
    let text = line.replace(timeReg, "").trim();
    timeReg.lastIndex = 0;
    while ((match = timeReg.exec(line))) {
      const min = parseInt(match[1] ?? "0");
      const sec = parseInt(match[2] ?? "0");
      const ms = match[3] ? parseInt(match[3].padEnd(3, "0")) : 0;
      const time = min * 60 * 1000 + sec * 1000 + ms;
      result.push({ time, text });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

watch(lyricsModal, (open) => {
  if (!open) currentLyricLine.value = 0;
});

// If the lyrics modal is open and the song changes (e.g. nextSong after ended),
// automatically load the new song's lyrics so the modal stays in sync.
watch(currentIndex, (newIdx, oldIdx) => {
  if (lyricsModal.value && newIdx !== oldIdx && currentSong.value) {
    // reuse the existing loader which handles parsing and sets parsedLyrics
    showCurrentLyrics();
  }
});
</script>

<style scoped>
.container {
  max-width: 900px;
}
/* 卡片内容居中 */
.grid > * {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
/* 绝对居中播放器按钮区域 */
.fixed.bottom-0 .absolute.left-1\/2 {
  z-index: 10;
}
</style>
