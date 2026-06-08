import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { createError, deleteCookie, getCookie, H3Event, setCookie } from 'h3'

const COOKIE_NAME = 'sor_upload_session'
const CARD_PREFIX = 'SOR'

function getUploadAuthConfig(event: H3Event) {
  const config = useRuntimeConfig(event)
  const password = String(process.env.SOR_UPLOAD_PASSWORD || process.env.NUXT_UPLOAD_PASSWORD || config.uploadPassword || '')
  const secret = String(config.uploadSessionSecret || config.musicApiKey || '')
  const cardSecret = String(
    process.env.SOR_UPLOAD_CARD_SECRET ||
      process.env.NUXT_UPLOAD_CARD_SECRET ||
      config.uploadCardSecret ||
      secret
  )
  const ttlSeconds = Math.max(
    300,
    Number(process.env.NUXT_UPLOAD_SESSION_TTL_SECONDS || config.uploadSessionTtlSeconds || 43200)
  )
  const cardTtlSeconds = Math.max(
    60,
    Number(process.env.SOR_UPLOAD_CARD_TTL_SECONDS || process.env.NUXT_UPLOAD_CARD_TTL_SECONDS || config.uploadCardTtlSeconds || 3600)
  )
  const publicUrl = String(process.env.SOR_UPLOAD_PUBLIC_URL || process.env.NUXT_UPLOAD_PUBLIC_URL || config.uploadPublicUrl || 'https://sor.orcl.cc/library')
  return { password, secret, ttlSeconds, cardSecret, cardTtlSeconds, publicUrl }
}

function signUploadSession(secret: string, expires: number) {
  return createHmac('sha256', secret).update(`upload:${expires}`).digest('base64url')
}

function signUploadCard(secret: string, expires: number, nonce: string) {
  return createHmac('sha256', secret).update(`card:${expires}:${nonce}`).digest('base64url').slice(0, 24)
}

function constantTimeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

function passwordMatches(input: string, expected: string) {
  if (!input || !expected) return false
  return constantTimeEqual(input, expected)
}

function uploadCardMatches(input: string, secret: string) {
  if (!input || !secret) return false

  const [prefix, expiresText, nonce, signature] = input.trim().split('.')
  if (prefix !== CARD_PREFIX || !expiresText || !nonce || !signature) return false

  const expires = Number.parseInt(expiresText, 36)
  if (!expires || Date.now() > expires) return false

  const expected = signUploadCard(secret, expires, nonce)
  return constantTimeEqual(signature, expected)
}

export function isUploadAuthConfigured(event: H3Event) {
  const { password, secret } = getUploadAuthConfig(event)
  return Boolean(password && secret)
}

export function getUploadPublicUrl(event: H3Event) {
  const { publicUrl } = getUploadAuthConfig(event)
  return publicUrl
}

export function createUploadCard(event: H3Event) {
  const { password, secret, cardSecret, cardTtlSeconds } = getUploadAuthConfig(event)
  if (!password || !secret || !cardSecret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Upload auth is not configured',
      data: {
        error: 'upload_auth_not_configured',
        message: 'Upload access is disabled until SOR_UPLOAD_PASSWORD is configured.'
      }
    })
  }

  const expires = Date.now() + cardTtlSeconds * 1000
  const nonce = randomBytes(9).toString('base64url')
  const code = `${CARD_PREFIX}.${expires.toString(36)}.${nonce}.${signUploadCard(cardSecret, expires, nonce)}`
  return {
    code,
    expiresAt: new Date(expires).toISOString(),
    ttlSeconds: cardTtlSeconds
  }
}

export function hasUploadSession(event: H3Event) {
  const { secret } = getUploadAuthConfig(event)
  if (!secret) return false

  const raw = getCookie(event, COOKIE_NAME)
  if (!raw) return false

  const [expiresText, signature] = raw.split('.')
  const expires = Number(expiresText)
  if (!expires || !signature || Date.now() > expires) return false

  const expected = signUploadSession(secret, expires)
  return constantTimeEqual(signature, expected)
}

export function assertUploadSession(event: H3Event) {
  if (!isUploadAuthConfigured(event)) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Upload auth is not configured',
      data: {
        error: 'upload_auth_not_configured',
        message: 'Upload access is disabled until SOR_UPLOAD_PASSWORD is configured.'
      }
    })
  }

  if (!hasUploadSession(event)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Upload password required',
      data: {
        error: 'upload_auth_required',
        message: '请输入上传口令后再上传。'
      }
    })
  }
}

export function createUploadSession(event: H3Event, password: string) {
  const { password: expectedPassword, secret, ttlSeconds, cardSecret } = getUploadAuthConfig(event)
  if (!expectedPassword || !secret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Upload auth is not configured',
      data: {
        error: 'upload_auth_not_configured',
        message: 'Upload access is disabled until SOR_UPLOAD_PASSWORD is configured.'
      }
    })
  }

  if (!passwordMatches(password, expectedPassword) && !uploadCardMatches(password, cardSecret)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid upload password',
      data: {
        error: 'invalid_upload_password',
        message: '上传口令不正确。'
      }
    })
  }

  const expires = Date.now() + ttlSeconds * 1000
  const value = `${expires}.${signUploadSession(secret, expires)}`
  setCookie(event, COOKIE_NAME, value, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ttlSeconds
  })
  return { ok: true, expiresAt: new Date(expires).toISOString() }
}

export function clearUploadSession(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/'
  })
  return { ok: true }
}
