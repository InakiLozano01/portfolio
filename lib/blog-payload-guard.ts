const BLOG_SAVE_MAX_BYTES = 12 * 1024 * 1024

const EMBEDDED_DATA_IMAGE_PATTERN = /<img\b[^>]*\bsrc\s*=\s*(?:"data:image\/|'data:image\/|data:image\/)/i
const DATA_IMAGE_PATTERN = /data:image\/[a-z0-9.+-]+;base64,/i

const BLOG_HTML_FIELDS = [
  'content',
  'content_en',
  'content_es',
  'footer',
  'footer_en',
  'footer_es',
  'bibliography',
  'bibliography_en',
  'bibliography_es',
]

export class BlogPayloadError extends Error {
  status: number

  constructor(message: string, status = 413) {
    super(message)
    this.name = 'BlogPayloadError'
    this.status = status
  }
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length
}

function formatMegabytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function hasEmbeddedDataImage(value: unknown) {
  if (typeof value !== 'string') return false
  return EMBEDDED_DATA_IMAGE_PATTERN.test(value) || DATA_IMAGE_PATTERN.test(value)
}

export function assertBlogPayloadCanBeSaved(payload: Record<string, unknown>) {
  const embeddedField = BLOG_HTML_FIELDS.find((field) => hasEmbeddedDataImage(payload[field]))
  if (embeddedField) {
    throw new BlogPayloadError(
      `Images are still embedded in ${embeddedField}. Wait for image uploads to finish, then save again.`
    )
  }

  const size = byteLength(JSON.stringify(payload))
  if (size > BLOG_SAVE_MAX_BYTES) {
    throw new BlogPayloadError(
      `This blog payload is ${formatMegabytes(size)}, which is too large to save. Upload images as files instead of embedding them in the editor.`
    )
  }
}

export function isBlogPayloadError(error: unknown): error is BlogPayloadError {
  return error instanceof BlogPayloadError
}

export function isMongoDocumentSizeError(error: unknown) {
  if (!(error instanceof Error)) return false
  const code = (error as { code?: unknown }).code
  const message = error.message.toLowerCase()

  return (
    code === 'ERR_OUT_OF_RANGE' ||
    message.includes('object to serialize too large') ||
    message.includes('bsonobj size') ||
    message.includes('document is larger than') ||
    (message.includes('offset') && message.includes('out of range'))
  )
}

export const BLOG_DOCUMENT_TOO_LARGE_MESSAGE =
  'This blog is too large to save. Upload pasted images as files and avoid embedded base64 images in the editor.'
