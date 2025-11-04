import { eventHandler, H3Event } from 'h3'

export default eventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig(event)
  const apiUrl = config.musicApiUrl
  const apiKey = config.musicApiKey

  if (!apiUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Music API URL not configured',
      data: {
        error: 'missing_server_api_url',
        message:
          'Server is missing MUSIC_API_URL. Set MUSIC_API_URL in your environment (see README).'
      }
    })
  }

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

  // Build URL for artists endpoint
  const url = new URL(`${apiUrl}/artists`)
  const query = getQuery(event) as Record<string, any>

  // Forward query params (e.g., q)
  Object.keys(query || {}).forEach(k => {
    if (query[k] !== undefined && query[k] !== null) {
      url.searchParams.set(k, String(query[k]))
    }
  })

  // Get client IP
  const clientIp =
    getRequestIP(event, {
      xForwardedFor: true
    }) || 'unknown'

  // Get User-Agent
  const userAgent = event.node.req.headers['user-agent'] || ''

  try {
    const headers: Record<string, string> = {
      'X-API-KEY': apiKey,
      'User-Agent': userAgent
    }
    if (clientIp !== 'unknown') headers['X-Forwarded-For'] = clientIp

    return await $fetch(url.toString(), {
      headers
    })
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || err?.response?.status || 502,
      statusMessage: err?.statusMessage || err?.response?.statusText || 'Upstream service error',
      data: {
        error: 'fetch_failed',
        message: err?.message || 'Failed to fetch artists from upstream service.'
      }
    })
  }
})
