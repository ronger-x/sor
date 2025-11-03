import { eventHandler, H3Event } from 'h3'

export default eventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig(event)
  const apiKey = config.musicApiKey

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Music API Key not configured',
      data: {
        error: 'missing_server_api_key',
        message:
          'Server is missing MUSIC_API_KEY. Set MUSIC_API_KEY in your environment (see README).'
      }
    })
  }

  const query = getQuery(event) as { url?: string }
  if (!query?.url) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing lyrics URL parameter',
      data: {
        error: 'missing_url',
        message: 'The "url" parameter is required'
      }
    })
  }
  // ✅ 使用 H3 内置方法获取客户端 IP
  const clientIp =
    getRequestIP(event, {
      xForwardedFor: true // 启用 X-Forwarded-For 支持
    }) || 'unknown'

  // 获取 User-Agent
  const userAgent = event.node.req.headers['user-agent'] || ''

  try {
    const headers: Record<string, string> = {
      'X-API-KEY': apiKey,
      'User-Agent': userAgent
    }
    if (clientIp !== 'unknown') headers['X-Forwarded-For'] = clientIp
    // 可添加自定义指纹 header，如 headers['X-Client-Fingerprint'] = ...
    return await $fetch(query.url, {
      headers
    })
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || err?.response?.status || 502,
      statusMessage: err?.statusMessage || err?.response?.statusText || 'Upstream service error',
      data: {
        error: 'fetch_failed',
        message: err?.message || 'Failed to fetch lyrics from upstream service.'
      }
    })
  }
})
