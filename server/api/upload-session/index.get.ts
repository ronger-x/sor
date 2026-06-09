import { eventHandler, H3Event } from 'h3'
import { hasUploadSession, isUploadAuthConfigured } from '../../utils/uploadAuth'

export default eventHandler((event: H3Event) => {
  const config = useRuntimeConfig(event)
  return {
    configured: isUploadAuthConfigured(event),
    authenticated: hasUploadSession(event),
    wechat: {
      name: String(process.env.SOR_WECHAT_NAME || process.env.NUXT_WECHAT_NAME || config.wechatName || ''),
      qrUrl: String(process.env.SOR_WECHAT_QR_URL || process.env.NUXT_WECHAT_QR_URL || config.wechatQrUrl || '')
    }
  }
})
