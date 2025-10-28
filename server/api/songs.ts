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

  // forward query params from client
  const url = new URL('https://music.czx.me:6/songs')
  const q = getQuery(event) as Record<string, any>
  Object.keys(q || {}).forEach(k => {
    if (q[k] !== undefined && q[k] !== null) url.searchParams.set(k, String(q[k]))
  })

  try {
    return await $fetch(url.toString(), {
      headers: {
        'X-API-KEY': apiKey
      }
    })
  } catch (err: any) {
    event.node.res.statusCode = err?.statusCode || 502
    return { error: 'fetch_failed', message: err?.message || String(err) }
  }
})
