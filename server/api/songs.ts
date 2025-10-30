import { eventHandler, H3Event } from 'h3'

export default eventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig(event)
  const apiUrl = config.musicApiUrl
  const apiKey = config.musicApiKey

  if (!apiUrl) {
    event.node.res.statusCode = 500
    return {
      error: 'missing_server_api_url',
      message:
        'Server is missing MUSIC_API_URL. Set MUSIC_API_URL in your environment (see README).'
    }
  }

  if (!apiKey) {
    event.node.res.statusCode = 500
    return {
      error: 'missing_server_api_key',
      message:
        'Server is missing MUSIC_API_KEY. Set MUSIC_API_KEY in your environment (see README).'
    }
  }

  // forward query params from client
  const url = new URL(apiUrl)
  const q = getQuery(event) as Record<string, any>
  Object.keys(q || {}).forEach(k => {
    if (q[k] !== undefined && q[k] !== null) url.searchParams.set(k, String(q[k]))
  })

  // ✅ 使用 H3 内置方法获取客户端 IP
  const clientIp = getRequestIP(event, {
    xForwardedFor: true  // 启用 X-Forwarded-For 支持
  }) || 'unknown'

  // 获取 User-Agent
  const userAgent = event.node.req.headers['user-agent'] || ''

  try {
    const headers: Record<string, string> = {
      'X-API-KEY': apiKey,
      'User-Agent': userAgent
    }
    if (clientIp !== 'unknown') headers['X-Forwarded-For'] = clientIp
    // 可以在这里添加自定义指纹 header，如 headers['X-Client-Fingerprint'] = ...
    return await $fetch(url.toString(), {
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
