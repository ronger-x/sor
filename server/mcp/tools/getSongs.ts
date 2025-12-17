import { z } from 'zod'

export default defineMcpTool({
  name: 'getSongs',
  description: '搜索歌曲，根据关键词、歌手等条件获取歌曲列表',
  inputSchema: {
    q: z.string().optional().describe('搜索关键词'),
    artist: z.string().optional().describe('歌手名称'),
    album: z.string().optional().describe('专辑名称'),
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

    const url = new URL(apiUrl)
    // 添加查询参数
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
            text: `Error fetching songs: ${err?.message || 'Unknown error'}`
          }
        ]
      }
    }
  }
})
