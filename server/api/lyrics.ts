import { eventHandler, H3Event } from 'h3'

export default eventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig(event)
  const apiKey = config.musicApiKey

  if (!apiKey) {
    event.node.res.statusCode = 500
    return {
      error: 'missing_server_api_key',
      message:
        'Server is missing MUSIC_API_KEY. Set MUSIC_API_KEY in your environment (see README).'
    }
  }

  const query = getQuery(event) as { url?: string }
  if (!query?.url) {
    event.node.res.statusCode = 400
    return { error: 'missing_url' }
  }

  // 获取客户端 IP
  const forwardedFor = event.node.req.headers['x-forwarded-for']
  const remoteAddress = event.node.req.socket?.remoteAddress
  const clientIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor || remoteAddress || ''

  // 获取 User-Agent
  const userAgent = event.node.req.headers['user-agent'] || ''

  try {
    const headers: Record<string, string> = {
      'X-API-KEY': apiKey,
      'User-Agent': userAgent
    }
    if (clientIp) headers['X-Forwarded-For'] = String(clientIp)
    // 可添加自定义指纹 header，如 headers['X-Client-Fingerprint'] = ...
    return await $fetch(query.url, {
      headers
    })
  } catch (err: any) {
    const code = err?.statusCode || err?.response?.status || 502
    const msg =
      err?.response?.statusText ||
      err?.statusMessage ||
      err?.message ||
      'Failed to fetch resource from upstream service.'
    event.node.res.statusCode = code
    return { error: 'fetch_failed', code, message: msg }
  }
})
