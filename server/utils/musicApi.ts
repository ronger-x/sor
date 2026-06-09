import { H3Event } from 'h3'

export function getMusicApiConfig(event: H3Event) {
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

  return { apiUrl, apiKey }
}

export function buildMusicApiUrl(event: H3Event, suffix = '') {
  const { apiUrl } = getMusicApiConfig(event)
  const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl
  const path = suffix ? `/${suffix.replace(/^\/+/, '')}` : ''
  return new URL(`${base}${path}`)
}

export function buildMusicApiHeaders(event: H3Event) {
  const { apiKey } = getMusicApiConfig(event)
  const clientIp =
    getRequestIP(event, {
      xForwardedFor: true
    }) || 'unknown'
  const userAgent = event.node.req.headers['user-agent'] || ''
  const headers: Record<string, string> = {
    'X-API-KEY': apiKey,
    'User-Agent': String(userAgent)
  }
  if (clientIp !== 'unknown') headers['X-Forwarded-For'] = clientIp
  return headers
}

export function forwardQueryParams(event: H3Event, url: URL) {
  const query = getQuery(event) as Record<string, any>
  Object.keys(query || {}).forEach(k => {
    if (query[k] !== undefined && query[k] !== null) {
      url.searchParams.set(k, String(query[k]))
    }
  })
}

export async function fetchMusicApi<T = unknown>(
  event: H3Event,
  suffix = '',
  options: Record<string, any> = {}
): Promise<T> {
  const url = buildMusicApiUrl(event, suffix)
  if (options.forwardQuery !== false) {
    forwardQueryParams(event, url)
  }

  try {
    return (await $fetch(url.toString(), {
      ...options,
      headers: {
        ...buildMusicApiHeaders(event),
        ...(options.headers || {})
      }
    })) as T
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || err?.response?.status || 502,
      statusMessage: err?.statusMessage || err?.response?.statusText || 'Upstream service error',
      data: {
        error: 'fetch_failed',
        message: err?.message || 'Failed to fetch resource from upstream service.'
      }
    })
  }
}
