import { ref, type Ref } from 'vue'

export function useAudioPlayer() {
  const audioRef = ref<HTMLAudioElement | null>(null)

  function initAudio(audio: HTMLAudioElement) {
    audioRef.value = audio
  }

  function getAudio(): HTMLAudioElement | null {
    return audioRef.value
  }

  return {
    audioRef,
    initAudio,
    getAudio
  }
}
