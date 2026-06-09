// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/'
  },

  devtools: { enabled: true },

  ssr: false,

  css: ['~/assets/css/main.css'],

  ui: {
    fonts: false
  },

  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxtjs/device', '@nuxt/image', '@nuxtjs/mcp-toolkit'],

  // MCP Toolkit 配置
  mcp: {
    name: 'SOR Music MCP Server',
    version: '1.0.0',
    route: '/mcp', // MCP 服务端点
    dir: 'mcp' // MCP 定义文件目录 (相对于 server/)
  },

  runtimeConfig: {
    // server-only keys (not exposed to the client)
    musicApiUrl: process.env.NUXT_MUSIC_API_URL || '',
    musicApiKey: process.env.NUXT_MUSIC_API_KEY || '',
    uploadPassword: process.env.NUXT_UPLOAD_PASSWORD || process.env.SOR_UPLOAD_PASSWORD || '',
    // Upload session signing secret. Must be configured explicitly to enable
    // upload features — it is intentionally NOT derived from musicApiKey so that
    // the upload auth domain stays decoupled from the upstream API credential.
    uploadSessionSecret:
      process.env.NUXT_UPLOAD_SESSION_SECRET || process.env.SOR_UPLOAD_SESSION_SECRET || '',
    uploadSessionTtlSeconds: process.env.NUXT_UPLOAD_SESSION_TTL_SECONDS || '43200',
    uploadCardSecret:
      process.env.NUXT_UPLOAD_CARD_SECRET ||
      process.env.SOR_UPLOAD_CARD_SECRET ||
      process.env.NUXT_UPLOAD_SESSION_SECRET ||
      process.env.SOR_UPLOAD_SESSION_SECRET ||
      '',
    uploadCardTtlSeconds: process.env.NUXT_UPLOAD_CARD_TTL_SECONDS || process.env.SOR_UPLOAD_CARD_TTL_SECONDS || '3600',
    // Public entry URL shown in share links / WeChat replies. Defaults to a
    // relative path so no production domain is baked into the source.
    uploadPublicUrl: process.env.NUXT_UPLOAD_PUBLIC_URL || process.env.SOR_UPLOAD_PUBLIC_URL || '/library',
    wechatMpToken: process.env.NUXT_WECHAT_MP_TOKEN || process.env.WECHAT_MP_TOKEN || process.env.SOR_WECHAT_TOKEN || '',
    wechatQrUrl: process.env.NUXT_WECHAT_QR_URL || process.env.SOR_WECHAT_QR_URL || '',
    wechatName: process.env.NUXT_WECHAT_NAME || process.env.SOR_WECHAT_NAME || '',
    public: {
      // public runtime config goes here
    }
  }
})
