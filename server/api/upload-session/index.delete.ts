import { eventHandler, H3Event } from 'h3'
import { clearUploadSession } from '../../utils/uploadAuth'

export default eventHandler((event: H3Event) => clearUploadSession(event))
