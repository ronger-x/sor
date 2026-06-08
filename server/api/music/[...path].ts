import { eventHandler, H3Event, readBody } from 'h3'
import { fetchMusicApi } from '../../utils/musicApi'
import { assertUploadSession } from '../../utils/uploadAuth'

const protectedMethods = new Set(['PATCH', 'DELETE'])

export default eventHandler(async (event: H3Event): Promise<unknown> => {
  const rawPath = event.context.params?.path
  const path = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath || '')
  const method = event.node.req.method || 'GET'
  if (protectedMethods.has(method.toUpperCase())) {
    assertUploadSession(event)
  }

  const hasBody = !['GET', 'HEAD'].includes(method.toUpperCase())
  const body = hasBody ? await readBody(event) : undefined

  return await fetchMusicApi(event, path, {
    method,
    body,
    forwardQuery: true
  })
})
