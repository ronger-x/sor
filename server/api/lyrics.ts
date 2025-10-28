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

  try {
    return await $fetch(query.url, {
      headers: { 'X-API-KEY': apiKey }
    })
  } catch (err: any) {
    event.node.res.statusCode = err?.statusCode || 502
    return { error: 'fetch_failed', message: err?.message || String(err) }
  }
})
