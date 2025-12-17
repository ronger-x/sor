import { z } from 'zod'
import { defineMcpTool } from '@nuxtjs/mcp-toolkit'

export default defineMcpTool({
  name: 'getAlbums',
  description: '获取专辑列表，可按歌手筛选',
  inputSchema: {
    artist: z.string().optional().describe('歌手名称，用于筛选该歌手的专辑'),
    page: z.number().optional().describe('页码'),
    limit: z.number().optional().describe('每页数量')
  },
  handler: async params => {
    const config = useRuntimeConfig()
    const apiUrl = config.musicApiUrl
    const apiKey = config.musicApiKey

    if (!apiUrl || !apiKey) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Music API not configured. Please set NUXT_MUSIC_API_URL and NUXT_MUSIC_API_KEY environment variables.'
          }
        ]
      }
    }

    const url = new URL(`${apiUrl}/albums`)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })

    try {
      const data = await $fetch(url.toString(), {
        headers: {
          'X-API-KEY': apiKey
        }
      })

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2)
          }
        ]
      }
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching albums: ${err?.message || 'Unknown error'}`
          }
        ]
      }
    }
  }
})
