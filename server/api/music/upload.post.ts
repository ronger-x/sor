import { eventHandler, H3Event, readMultipartFormData } from 'h3'
import { fetchMusicApi } from '../../utils/musicApi'
import { assertUploadSession } from '../../utils/uploadAuth'

export default eventHandler(async (event: H3Event): Promise<unknown> => {
  assertUploadSession(event)

  const parts = await readMultipartFormData(event)
  if (!parts?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing multipart form data',
      data: {
        error: 'missing_form_data',
        message: 'Upload requires multipart form data.'
      }
    })
  }

  const form = new FormData()
  for (const part of parts) {
    if (!part.name) continue
    if (part.filename) {
      form.append(
        part.name,
        new Blob([part.data as unknown as BlobPart], {
          type: part.type || 'application/octet-stream'
        }),
        part.filename
      )
      continue
    }
    form.append(part.name, part.data.toString('utf-8'))
  }

  return await fetchMusicApi(event, 'upload', {
    method: 'POST',
    body: form,
    forwardQuery: true
  })
})
