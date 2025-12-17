import { z } from 'zod'
import { defineMcpTool } from '@nuxtjs/mcp-toolkit'

export default defineMcpTool({
  name: 'getLyrics',
  description: '获取歌词内容，根据歌词 URL 获取歌词文本',
  inputSchema: {
    url: z.string().describe('歌词文件的 URL 地址')
  },
  handler: async ({ url }) => {
    const config = useRuntimeConfig()
    const apiKey = config.musicApiKey

    if (!apiKey) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Music API Key not configured. Please set NUXT_MUSIC_API_KEY environment variable.'
          }
        ]
      }
    }

    if (!url) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: The "url" parameter is required'
          }
        ]
      }
    }

    try {
      const data = await $fetch(url, {
        headers: {
          'X-API-KEY': apiKey
        }
      })

      return {
        content: [
          {
            type: 'text',
            text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
          }
        ]
      }
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching lyrics: ${err?.message || 'Unknown error'}`
          }
        ]
      }
    }
  }
})
