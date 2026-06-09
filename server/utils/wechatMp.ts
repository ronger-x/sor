import { createHash, timingSafeEqual } from 'node:crypto'
import { createError, getQuery, H3Event, setHeader } from 'h3'
import { createUploadCard, getUploadPublicUrl } from './uploadAuth'

interface WechatMessage {
  toUserName: string
  fromUserName: string
  msgType: string
  content: string
  event: string
}

function getWechatConfig(event: H3Event) {
  const config = useRuntimeConfig(event)
  const token = String(process.env.WECHAT_MP_TOKEN || process.env.SOR_WECHAT_TOKEN || process.env.NUXT_WECHAT_MP_TOKEN || config.wechatMpToken || '')
  return { token }
}

function constantTimeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

function sha1(input: string) {
  return createHash('sha1').update(input).digest('hex')
}

export function assertWechatSignature(event: H3Event) {
  const { token } = getWechatConfig(event)
  if (!token) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Wechat token is not configured',
      data: {
        error: 'wechat_token_not_configured',
        message: 'WeChat token is required. Set NUXT_WECHAT_MP_TOKEN in your environment.'
      }
    })
  }

  const query = getQuery(event)
  const signature = String(query.signature || '')
  const timestamp = String(query.timestamp || '')
  const nonce = String(query.nonce || '')
  if (!signature || !timestamp || !nonce) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing Wechat signature parameters'
    })
  }

  const expected = sha1([token, timestamp, nonce].sort().join(''))
  if (!constantTimeEqual(signature, expected)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid Wechat signature'
    })
  }

  return query
}

function decodeXmlText(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function getXmlTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${tag}>`))
  return decodeXmlText((match?.[1] || match?.[2] || '').trim())
}

function cdata(value: string) {
  return `<![CDATA[${value.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`
}

export function parseWechatXml(xml: string): WechatMessage {
  return {
    toUserName: getXmlTag(xml, 'ToUserName'),
    fromUserName: getXmlTag(xml, 'FromUserName'),
    msgType: getXmlTag(xml, 'MsgType'),
    content: getXmlTag(xml, 'Content'),
    event: getXmlTag(xml, 'Event')
  }
}

function formatBeijingTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false
  })
}

function shouldIssueUploadCard(message: WechatMessage) {
  if (message.msgType !== 'text') return false
  const content = message.content.trim().toLowerCase()
  return ['上传口令', '上传', '口令', '发卡', 'sor', 'sor上传'].includes(content)
}

function buildTextReply(message: WechatMessage, content: string) {
  const now = Math.floor(Date.now() / 1000)
  return [
    '<xml>',
    `<ToUserName>${cdata(message.fromUserName)}</ToUserName>`,
    `<FromUserName>${cdata(message.toUserName)}</FromUserName>`,
    `<CreateTime>${now}</CreateTime>`,
    `<MsgType>${cdata('text')}</MsgType>`,
    `<Content>${cdata(content)}</Content>`,
    '</xml>'
  ].join('')
}

export function buildWechatReply(event: H3Event, message: WechatMessage) {
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')

  if (shouldIssueUploadCard(message)) {
    const card = createUploadCard(event)
    const publicUrl = getUploadPublicUrl(event)
    return buildTextReply(
      message,
      [
        'SOR 云曲库上传入口',
        publicUrl,
        '',
        '临时上传卡',
        card.code,
        '',
        `有效期至：${formatBeijingTime(card.expiresAt)}`,
        '打开页面后输入卡密解锁上传。请勿转发。'
      ].join('\n')
    )
  }

  return buildTextReply(
    message,
    [
      '回复「上传口令」获取 SOR 云曲库临时上传卡。',
      `入口：${getUploadPublicUrl(event)}`
    ].join('\n')
  )
}
