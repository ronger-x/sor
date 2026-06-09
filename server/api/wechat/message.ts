import { createError, eventHandler, H3Event, readRawBody, setHeader } from 'h3'
import { assertWechatSignature, buildWechatReply, parseWechatXml } from '../../utils/wechatMp'

export default eventHandler(async (event: H3Event) => {
  const method = (event.node.req.method || 'GET').toUpperCase()
  const query = assertWechatSignature(event)

  if (method === 'GET') {
    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    return String(query.echostr || '')
  }

  if (method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed'
    })
  }

  const rawBody = (await readRawBody(event, 'utf8')) || ''
  const message = parseWechatXml(rawBody)
  return buildWechatReply(event, message)
})
