// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  css: ["~/assets/css/main.css"],

  ui: {
    fonts: false,
  },
  modules: ["@nuxt/ui"],

  runtimeConfig: {
    public: {
      musicApiKey: process.env.MUSIC_API_KEY || "",
    },
  },
});
