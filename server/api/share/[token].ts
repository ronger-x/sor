import { eventHandler, H3Event } from 'h3'

function resolveSongsBase(apiUrl: string) {
  return apiUrl.replace(/\/?$/, '')
}

export default eventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig(event)
  const apiUrl = config.musicApiUrl

  if (!apiUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Music API URL not configured',
      data: {
        error: 'missing_server_api_url',
        message: 'Server is missing the music API URL. Set NUXT_MUSIC_API_URL in your environment.'
      }
    })
  }

  const token = getRouterParam(event, 'token')
  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing share token',
      data: { error: 'missing_share_token', message: 'The share token is required.' }
    })
  }

  const clientIp = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const userAgent = event.node.req.headers['user-agent'] || ''
  const url = `${resolveSongsBase(apiUrl)}/share/${encodeURIComponent(token)}`

  try {
    const headers: Record<string, string> = {
      'User-Agent': String(userAgent)
    }
    if (clientIp !== 'unknown') headers['X-Forwarded-For'] = clientIp

    return await $fetch(url, { headers })
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || err?.response?.status || 502,
      statusMessage: err?.statusMessage || err?.response?.statusText || 'Upstream service error',
      data: {
        error: 'share_fetch_failed',
        message: err?.message || 'Failed to fetch share detail from upstream service.'
      }
    })
  }
})
