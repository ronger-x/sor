import { eventHandler, H3Event, readBody } from 'h3'
import { createUploadSession } from '../../utils/uploadAuth'

export default eventHandler(async (event: H3Event) => {
  const body = await readBody<{ password?: string }>(event)
  return createUploadSession(event, String(body?.password || ''))
})
