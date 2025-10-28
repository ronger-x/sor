// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  ssr: false,

  css: ['~/assets/css/main.css'],

  ui: {
    fonts: false
  },
  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxtjs/device'],
  runtimeConfig: {
    // server-only keys (not exposed to the client)
    musicApiUrl: process.env.NUXT_MUSIC_API_URL || '',
    musicApiKey: process.env.NUXT_MUSIC_API_KEY || '',
    public: {
      // public runtime config goes here
    }
  }
})
