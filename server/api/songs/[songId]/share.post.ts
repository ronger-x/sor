import { eventHandler, H3Event } from 'h3'

interface SongShareResponse {
  token?: string
  share_url?: string
  [key: string]: unknown
}

function resolveSongsBase(apiUrl: string) {
  return apiUrl.replace(/\/?$/, '')
}

function firstHeader(event: H3Event, name: string) {
  const value = event.node.req.headers[name.toLowerCase()]
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return ''
  return raw.split(',')[0]?.trim() || ''
}

function inferRequestProtocol(event: H3Event, host: string) {
  const forwardedProto = firstHeader(event, 'x-forwarded-proto')
  if (forwardedProto) return forwardedProto
  return host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
}

function inferSharePath(event: H3Event, token: string, configuredBaseURL?: string) {
  const requestPath = (event.path || event.node.req.url || '').split('?')[0] || ''
  const apiIndex = requestPath.indexOf('/api/')
  const requestPrefix = apiIndex >= 0 ? requestPath.slice(0, apiIndex) : ''
  const configuredPrefix = configuredBaseURL && configuredBaseURL !== '/' ? configuredBaseURL : ''
  const prefix = (requestPrefix || configuredPrefix).replace(/\/+$/, '')
  return `${prefix}/share/${encodeURIComponent(token)}`
}

function rewriteShareUrl(event: H3Event, token: string, configuredBaseURL?: string) {
  const host = firstHeader(event, 'x-forwarded-host') || firstHeader(event, 'host')
  if (!host) return ''
  const protocol = inferRequestProtocol(event, host)
  const path = inferSharePath(event, token, configuredBaseURL)
  return `${protocol}://${host}${path.startsWith('/') ? path : `/${path}`}`
}

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
        message: 'Server is missing the music API URL. Set NUXT_MUSIC_API_URL in your environment.'
      }
    })
  }

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Music API Key not configured',
      data: {
        error: 'missing_server_api_key',
        message: 'Server is missing the music API key. Set NUXT_MUSIC_API_KEY in your environment.'
      }
    })
  }

  const songId = getRouterParam(event, 'songId')
  if (!songId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing song id',
      data: { error: 'missing_song_id', message: 'The song id is required.' }
    })
  }

  const body = await readBody(event)
  const clientIp = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const userAgent = event.node.req.headers['user-agent'] || ''
  const url = `${resolveSongsBase(apiUrl)}/${encodeURIComponent(songId)}/share`

  try {
    const headers: Record<string, string> = {
      'X-API-KEY': apiKey,
      'User-Agent': String(userAgent)
    }
    if (clientIp !== 'unknown') headers['X-Forwarded-For'] = clientIp

    const result = await $fetch<SongShareResponse>(url, {
      method: 'POST',
      headers,
      body
    })
    if (result.token) {
      const localShareUrl = rewriteShareUrl(event, result.token, config.app?.baseURL)
      if (localShareUrl) {
        return {
          ...result,
          share_url: localShareUrl
        }
      }
    }
    return result
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || err?.response?.status || 502,
      statusMessage: err?.statusMessage || err?.response?.statusText || 'Upstream service error',
      data: {
        error: 'share_create_failed',
        message: err?.message || 'Failed to create share link from upstream service.'
      }
    })
  }
})
