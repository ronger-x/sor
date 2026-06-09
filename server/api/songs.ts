import { eventHandler, H3Event } from 'h3'
import { fetchMusicApi } from '../utils/musicApi'

export default eventHandler(async (event: H3Event): Promise<unknown> => {
  return await fetchMusicApi(event)
})
