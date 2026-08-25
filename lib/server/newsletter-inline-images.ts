import fs from 'fs/promises'
import path from 'path'
import { createHash } from 'crypto'

export type NewsletterInlineAttachment = {
  filename: string
  content: Buffer
  cid: string
  contentType: string
  contentDisposition?: 'inline'
}

const PUBLIC_ROOT = path.join(process.cwd(), 'public')
const MAX_EDGE = 1200
const JPEG_QUALITY = 82

function isOurAssetUrl(src: string, baseUrl: string): boolean {
  const raw = (src || '').trim()
  if (!raw || raw.startsWith('cid:') || raw.startsWith('data:')) return false
  if (raw.startsWith('/')) return true
  try {
    const u = new URL(raw)
    const base = new URL(baseUrl)
    return u.hostname === base.hostname || u.hostname === 'inakilozano.com' || u.hostname === 'www.inakilozano.com'
  } catch {
    return false
  }
}

function urlToPublicPath(src: string, _baseUrl: string): string | null {
  try {
    let pathname = ''
    if (src.startsWith('/')) {
      pathname = src.split('?')[0].split('#')[0]
    } else {
      const u = new URL(src)
      pathname = u.pathname
    }
    if (!pathname.startsWith('/')) pathname = `/${pathname}`
    // only allow public assets
    if (pathname.includes('..')) return null
    const full = path.join(PUBLIC_ROOT, pathname)
    if (!full.startsWith(PUBLIC_ROOT)) return null
    return full
  } catch {
    return null
  }
}

async function fileToEmailJpeg(filePath: string): Promise<{ buffer: Buffer; contentType: string; ext: string } | null> {
  try {
    await fs.access(filePath)
  } catch {
    return null
  }

  try {
    // sharp is available in the production image
    const sharp = (await import('sharp')).default
    const buffer = await sharp(filePath)
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer()
    return { buffer, contentType: 'image/jpeg', ext: 'jpg' }
  } catch (error) {
    console.error('newsletter image convert failed', filePath, error)
    // fallback: attach original bytes if small enough
    try {
      const buffer = await fs.readFile(filePath)
      if (buffer.length > 1_500_000) return null
      const ext = path.extname(filePath).replace('.', '').toLowerCase() || 'bin'
      const contentType =
        ext === 'png'
          ? 'image/png'
          : ext === 'jpg' || ext === 'jpeg'
            ? 'image/jpeg'
            : ext === 'gif'
              ? 'image/gif'
              : ext === 'webp'
                ? 'image/webp'
                : 'application/octet-stream'
      return { buffer, contentType, ext }
    } catch {
      return null
    }
  }
}

/**
 * Rewrite <img src> for same-origin assets to cid:… and return nodemailer
 * inline attachments. Converts WebP/large PNGs to JPEG so Gmail/Outlook show them.
 */
export async function inlineNewsletterImages(
  html: string,
  options?: { baseUrl?: string }
): Promise<{ html: string; attachments: NewsletterInlineAttachment[] }> {
  const baseUrl = (options?.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://inakilozano.com').replace(/\/$/, '')
  const ensureBase = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`

  const attachments: NewsletterInlineAttachment[] = []
  const cache = new Map<string, string>() // filePath -> cid
  let counter = 0

  const replaceSrc = async (src: string): Promise<string> => {
    if (!isOurAssetUrl(src, ensureBase)) return src
    const filePath = urlToPublicPath(src, ensureBase)
    if (!filePath) return src
    if (cache.has(filePath)) return `cid:${cache.get(filePath)}`

    const converted = await fileToEmailJpeg(filePath)
    if (!converted) return src

    counter += 1
    const hash = createHash('sha1').update(filePath).digest('hex').slice(0, 10)
    const cid = `il-img-${counter}-${hash}@inakilozano.com`
    cache.set(filePath, cid)
    attachments.push({
      filename: `image-${counter}.${converted.ext}`,
      content: converted.buffer,
      cid,
      contentType: converted.contentType,
      contentDisposition: 'inline',
    })
    return `cid:${cid}`
  }

  // sequential to keep memory predictable on the VPS
  const imgRe = /<img\b([^>]*?)\bsrc=(["'])(.*?)\2([^>]*)>/gi
  const matches = [...html.matchAll(imgRe)]
  let out = html
  for (const match of matches) {
    const full = match[0]
    const src = match[3]
    const nextSrc = await replaceSrc(src)
    if (nextSrc === src) continue
    const rebuilt = full.replace(src, nextSrc)
    out = out.replace(full, rebuilt)
  }

  return { html: out, attachments }
}

/** Build HTML + inline attachments for a finished newsletter body. */
export async function withInlineNewsletterAssets(payload: {
  html: string
  attachments?: NewsletterInlineAttachment[] | undefined
}): Promise<{ html: string; attachments: NewsletterInlineAttachment[] }> {
  const inlined = await inlineNewsletterImages(payload.html)
  const merged = [...(payload.attachments || []), ...inlined.attachments]
  return { html: inlined.html, attachments: merged }
}
