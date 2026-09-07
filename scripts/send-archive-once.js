/**
 * One-shot: email every published blog with production layout + inline CID images
 * to NEWSLETTER_ALWAYS_TO only.
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const mongoose = require('mongoose')
const nodemailer = require('portfolio-nodemailer')
const sharp = require('sharp')

const ALWAYS_TO = (process.env.NEWSLETTER_ALWAYS_TO || '')
  .split(/[,;\s]+/)
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

const NAVY = '#1a2433'
const MAROON = '#800020'
const PUBLIC_ROOT = process.env.PUBLIC_ROOT || '/public'

const BASE = (() => {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || 'https://inakilozano.com').trim()
  const withProto = raw.startsWith('http') ? raw : `https://${raw}`
  try {
    const u = new URL(withProto)
    if (u.hostname === '0.0.0.0' || u.hostname === 'localhost') return 'https://inakilozano.com'
    return u.origin
  } catch {
    return 'https://inakilozano.com'
  }
})()

const LOGO_SRC = `${BASE}/il-logo-mark.png`

const STRINGS = {
  en: {
    subjectPrefix: 'New article: ',
    eyebrow: 'New article',
    readingTime: (m) => `${m} min read`,
    readOnSite: 'Read on the site',
    downloadPdf: 'Download PDF',
    footerNote: 'You received this because you confirmed your subscription to the blog.',
    unsubscribePrefix: 'Prefer not to receive these?',
    unsubscribeLinkText: 'Unsubscribe',
    signature: '— Iñaki F. Lozano',
  },
  es: {
    subjectPrefix: 'Nuevo artículo: ',
    eyebrow: 'Nuevo artículo',
    readingTime: (m) => `${m} min de lectura`,
    readOnSite: 'Leer en el sitio',
    downloadPdf: 'Descargar PDF',
    footerNote: 'Recibís este correo porque confirmaste tu suscripción al blog.',
    unsubscribePrefix: '¿Preferís no recibir estos correos?',
    unsubscribeLinkText: 'Darse de baja',
    signature: '— Iñaki F. Lozano',
  },
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function stringOrEmpty(v) {
  return typeof v === 'string' ? v : ''
}

function field(blog, name, lang) {
  const en = stringOrEmpty(blog[`${name}_en`]).trim() || stringOrEmpty(blog[name]).trim()
  const es = stringOrEmpty(blog[`${name}_es`]).trim() || en
  return lang === 'es' ? es || en : en || es
}

function absolutizeUrl(value) {
  const raw = stringOrEmpty(value).trim()
  if (!raw) return raw
  if (/^https?:\/\//i.test(raw) || raw.startsWith('cid:') || raw.startsWith('data:')) return raw
  if (raw.startsWith('//')) return `https:${raw}`
  return `${BASE}${raw.startsWith('/') ? '' : '/'}${raw}`
}

function sanitizeInlineStyle(style) {
  const allowed = new Set([
    'text-align', 'display',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'width', 'max-width', 'height', 'max-height',
    'color', 'background-color', 'font-style', 'font-weight', 'font-size', 'line-height',
    'border', 'border-left', 'border-radius',
  ])
  return stringOrEmpty(style)
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf(':')
      if (idx === -1) return ''
      const prop = part.slice(0, idx).trim().toLowerCase()
      const val = part.slice(idx + 1).trim()
      if (!allowed.has(prop) || !val) return ''
      if (/url\s*\(|expression\s*\(|javascript:/i.test(val)) return ''
      return `${prop}: ${val}`
    })
    .filter(Boolean)
    .join('; ')
}

function sanitizeArticleHtml(html) {
  let out = stringOrEmpty(html)
  out = out
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?(?:iframe|video|audio|source|math|object|embed|form|input|button)[^>]*>/gi, '')
  out = out.replace(/ on\w+\s*=\s*(['"]).*?\1/gi, '')
  out = out.replace(/ on\w+\s*=\s*[^\s>]+/gi, '')
  out = out.replace(/\sstyle=(["'])(.*?)\1/gi, (_m, _q, style) => {
    const safe = sanitizeInlineStyle(style)
    return safe ? ` style="${safe}"` : ''
  })
  out = out.replace(/(<a\b[^>]*\bhref=")(\/[^"]*)(")/gi, (_m, pre, href, post) => `${pre}${absolutizeUrl(href)}${post}`)
  out = out.replace(/<img\b([^>]*)>/gi, (_m, attrs) => {
    const srcMatch = attrs.match(/\bsrc=(["'])(.*?)\1/i)
    const altMatch = attrs.match(/\balt=(["'])(.*?)\1/i)
    const styleMatch = attrs.match(/\bstyle=(["'])(.*?)\1/i)
    const widthMatch = attrs.match(/\bwidth=(["'])?(.*?)\1?(?:\s|>|$)/i)
    if (!srcMatch) return ''
    const src = absolutizeUrl(srcMatch[2])
    if (!src) return ''
    const alt = altMatch ? altMatch[2] : ''
    const width = widthMatch ? widthMatch[2].replace(/["']/g, '').trim() : ''
    const existing = sanitizeInlineStyle(styleMatch ? styleMatch[2] : '')
    const baseStyle = 'display:block;max-width:100%;height:auto;margin:18px auto;border-radius:8px;'
    const style = existing ? `${baseStyle}${existing}` : baseStyle
    const widthAttr = width && /^\d+$/.test(width) ? ` width="${Math.min(Number(width), 600)}"` : ' width="600"'
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${widthAttr} style="${escapeHtml(style)}" />`
  })
  return out
}

function readingMinutes(html) {
  const text = stringOrEmpty(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const words = text ? text.split(' ').length : 0
  return Math.max(1, Math.round(words / 200))
}

function formatDate(value, lang) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return ''
  }
}

function button(href, label, variant) {
  const solid = `background-color:${MAROON};color:#ffffff;border:2px solid ${MAROON};`
  const outline = `background-color:#ffffff;color:${MAROON};border:2px solid ${MAROON};`
  return `
                    <td align="center" style="border-radius:999px;${variant === 'solid' ? solid : outline}">
                      <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:18px;text-decoration:none;font-weight:600;color:inherit;">${escapeHtml(label)}</a>
                    </td>`
}

const ARTICLE_STYLE = `
    .il-article { color:#1f2937; font-size:16px; line-height:1.75; text-align:justify; }
    .il-article p { margin:0 0 18px; text-align:justify; }
    .il-article p[style*="text-align: left"], .il-article p[style*="text-align:left"] { text-align:left !important; }
    .il-article p[style*="text-align: center"], .il-article p[style*="text-align:center"] { text-align:center !important; }
    .il-article h1,.il-article h2,.il-article h3,.il-article h4 { color:${NAVY}; line-height:1.3; margin:28px 0 12px; font-weight:700; text-align:left; }
    .il-article h2 { font-size:22px; } .il-article h3 { font-size:19px; }
    .il-article a { color:${MAROON}; text-decoration:underline; }
    .il-article img { display:block; max-width:100%; height:auto; border-radius:8px; margin:18px auto; }
    .il-article ul,.il-article ol { margin:0 0 18px; padding-left:22px; text-align:left; }
    .il-article blockquote { margin:0 0 18px; padding:10px 18px; border-left:3px solid ${MAROON}; background:#faf5f6; color:#374151; font-style:italic; }
    .il-article hr { border:0; border-top:1px solid #e5e7eb; margin:24px 0; }
`

function urlToPublicPath(src) {
  try {
    let pathname = src.startsWith('/') ? src.split('?')[0] : new URL(src).pathname
    if (pathname.includes('..')) return null
    const full = path.join(PUBLIC_ROOT, pathname)
    if (!full.startsWith(PUBLIC_ROOT)) return null
    return full
  } catch {
    return null
  }
}

async function inlineImages(html) {
  const attachments = []
  const cache = new Map()
  let counter = 0
  const re = /<img\b([^>]*?)\bsrc=(["'])(.*?)\2([^>]*)>/gi
  const matches = [...html.matchAll(re)]
  let out = html

  for (const match of matches) {
    const full = match[0]
    const src = match[3]
    if (!src || src.startsWith('cid:') || src.startsWith('data:')) continue
    const isOurs =
      src.startsWith('/') ||
      src.includes('inakilozano.com') ||
      src.startsWith(BASE)
    if (!isOurs) continue

    const filePath = urlToPublicPath(src)
    if (!filePath || !fs.existsSync(filePath)) {
      console.warn('missing image file', src, '->', filePath)
      continue
    }

    let cid = cache.get(filePath)
    if (!cid) {
      counter += 1
      const hash = crypto.createHash('sha1').update(filePath).digest('hex').slice(0, 10)
      cid = `il-img-${counter}-${hash}@inakilozano.com`
      let buffer
      try {
        buffer = await sharp(filePath)
          .rotate()
          .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 82, mozjpeg: true })
          .toBuffer()
      } catch (e) {
        console.warn('sharp failed', filePath, e.message)
        buffer = fs.readFileSync(filePath)
      }
      attachments.push({
        filename: `image-${counter}.jpg`,
        content: buffer,
        cid,
        contentType: 'image/jpeg',
        contentDisposition: 'inline',
      })
      cache.set(filePath, cid)
      console.log(`  inline ${path.basename(filePath)} -> cid (${Math.round(buffer.length / 1024)}KB)`)
    }
    out = out.replace(full, full.replace(src, `cid:${cid}`))
  }

  return { html: out, attachments }
}

function buildNewsletterEmail(blog, subscriber) {
  const lang = subscriber.language === 'es' ? 'es' : 'en'
  const strings = STRINGS[lang]
  const title = field(blog, 'title', lang)
  const subtitle = field(blog, 'subtitle', lang)
  const rawContent = field(blog, 'content', lang)
  const rawFooter = field(blog, 'footer', lang)
  const rawBibliography = field(blog, 'bibliography', lang)

  const articleHtml = sanitizeArticleHtml(rawContent)
  const footerHtml = rawFooter ? sanitizeArticleHtml(rawFooter) : ''
  const bibliographyHtml = rawBibliography ? sanitizeArticleHtml(rawBibliography) : ''

  const mins = readingMinutes(rawContent)
  const dateLabel = formatDate(blog.createdAt, lang)
  const metaParts = [dateLabel, strings.readingTime(mins)].filter(Boolean)
  const articleUrl = `${BASE}/${lang}/blog/${encodeURIComponent(blog.slug)}`
  const unsubscribeUrl = `${BASE}/${lang}/unsubscribe${subscriber.token ? `?token=${encodeURIComponent(subscriber.token)}` : ''}`
  const listUnsubscribeUrl = subscriber.token
    ? `${BASE}/api/subscribe/unsubscribe?token=${encodeURIComponent(subscriber.token)}`
    : undefined
  const pdfPath = lang === 'es' ? blog.pdf_es : blog.pdf_en
  const pdfUrl =
    typeof pdfPath === 'string' && pdfPath.trim()
      ? pdfPath.startsWith('http') ? pdfPath : `${BASE}${pdfPath.startsWith('/') ? '' : '/'}${pdfPath}`
      : null

  const subject = `${strings.subjectPrefix}${title || blog.slug}`
  const preheader = subtitle || `${strings.readingTime(mins)} · ${title}`
  const articleInline =
    'color:#1f2937;font-size:16px;line-height:1.75;font-family:Georgia,Times New Roman,serif;text-align:justify;'

  const ctas = `
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 4px;">
                  <tr>
${button(articleUrl, strings.readOnSite, 'solid')}
                    ${pdfUrl ? `<td style="width:12px;">&nbsp;</td>${button(pdfUrl, strings.downloadPdf, 'outline')}` : ''}
                  </tr>
                </table>`

  const inner = `
            <tr>
              <td align="center" style="padding:38px 30px 30px;background:linear-gradient(135deg,${NAVY},${MAROON});color:#ffffff;">
                <img src="${LOGO_SRC}" alt="Iñaki F. Lozano" width="56" height="56" style="display:block;margin:0 auto 18px;" />
                <p style="margin:0 0 10px;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.72);">${escapeHtml(strings.eyebrow)}</p>
                <h1 style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:27px;line-height:34px;font-weight:700;color:#ffffff;">${escapeHtml(title)}</h1>
                ${subtitle ? `<p style="margin:12px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;color:rgba(255,255,255,0.85);">${escapeHtml(subtitle)}</p>` : ''}
                ${metaParts.length ? `<p style="margin:16px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.6);">${escapeHtml(metaParts.join('  ·  '))}</p>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding:34px 30px 8px;font-family:Helvetica,Arial,sans-serif;">
                <div class="il-article" style="${articleInline}">${articleHtml}</div>
                ${footerHtml ? `<div class="il-article" style="margin-top:12px;${articleInline}">${footerHtml}</div>` : ''}
                ${bibliographyHtml ? `<hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;" /><div class="il-article" style="color:#4b5563;font-size:14px;line-height:1.65;">${bibliographyHtml}</div>` : ''}
              </td>
            </tr>
            <tr><td align="center" style="padding:0 30px 36px;">${ctas}</td></tr>`

  const footer = `
                <p style="margin:0 0 8px;color:#cbd5e1;">${escapeHtml(strings.footerNote)}</p>
                <p style="margin:0 0 14px;color:#cbd5e1;">${escapeHtml(strings.unsubscribePrefix)} <a href="${escapeHtml(unsubscribeUrl)}" style="color:#fbbf24;text-decoration:none;font-weight:600;">${escapeHtml(strings.unsubscribeLinkText)}</a></p>
                <p style="margin:0;font-style:italic;color:#94a3b8;">${escapeHtml(strings.signature)}</p>`

  const html = `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
    <style>${ARTICLE_STYLE}</style>
  </head>
  <body style="margin:0;padding:0;background-color:#eef0f5;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef0f5;">
      <tr><td align="center" style="padding:28px 16px;">
        <table role="presentation" width="100%" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;">
${inner}
          <tr><td align="center" style="padding:26px 28px;background:#0f172a;color:#cbd5e1;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;">
${footer}
          </td></tr>
        </table>
        <p style="margin:18px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#94a3b8;">Iñaki F. Lozano · Tucumán, Argentina</p>
      </td></tr>
    </table>
  </body>
</html>`

  const text = [
    title, subtitle, metaParts.join(' · '), '',
    rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), '',
    `${strings.readOnSite}: ${articleUrl}`,
    `${strings.unsubscribePrefix} ${unsubscribeUrl}`,
  ].filter(Boolean).join('\n')

  return { subject, html, text, listUnsubscribeUrl }
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI required')
  if (!ALWAYS_TO.length) throw new Error('NEWSLETTER_ALWAYS_TO required')
  if (!fs.existsSync(PUBLIC_ROOT)) throw new Error(`PUBLIC_ROOT missing: ${PUBLIC_ROOT}`)

  const port = parseInt(process.env.SMTP_PORT || '465', 10)
  const isSsl = (process.env.SMTP_ENCRYPT || '').toUpperCase() === 'SSL' || port === 465
  const from = process.env.CONTACT_MAIL_FROM || process.env.SMTP_USERNAME
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port,
    secure: isSsl,
    requireTLS: !isSsl,
    auth: { user: process.env.SMTP_USERNAME || from, pass: process.env.SMTP_PASSWORD },
    tls: { rejectUnauthorized: false },
  })

  await mongoose.connect(process.env.MONGODB_URI)
  const Blog = mongoose.model('Blog', new mongoose.Schema({}, { strict: false, collection: 'blogs' }))
  const Subscriber = mongoose.model('Subscriber', new mongoose.Schema({}, { strict: false, collection: 'subscribers' }))

  const blogs = await Blog.find({ published: true }).sort({ createdAt: 1 }).lean()
  const subDocs = await Subscriber.find({ email: { $in: ALWAYS_TO } }).select('email language token').lean()
  const byEmail = new Map(subDocs.map((s) => [String(s.email).toLowerCase(), s]))

  console.log(`Sending ${blogs.length} blogs to ${ALWAYS_TO.join(', ')} with inline images from ${PUBLIC_ROOT}`)

  const results = []
  for (const blog of blogs) {
    console.log(`\n== ${blog.slug}`)
    for (const email of ALWAYS_TO) {
      const existing = byEmail.get(email)
      const recipient = existing
        ? { email: existing.email, language: existing.language || 'en', token: existing.token }
        : { email, language: 'en' }
      const built = buildNewsletterEmail(blog, recipient)
      const { html, attachments } = await inlineImages(built.html)
      const headers = built.listUnsubscribeUrl
        ? {
            'List-Unsubscribe': `<${built.listUnsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          }
        : undefined
      try {
        const info = await transporter.sendMail({
          from,
          to: email,
          subject: built.subject,
          html,
          text: built.text,
          attachments,
          headers,
        })
        console.log(`OK → ${email} attachments=${attachments.length} ${info.messageId}`)
        results.push({ ok: true })
      } catch (err) {
        console.error(`FAIL → ${email}`, err.message || err)
        results.push({ ok: false })
      }
      await new Promise((r) => setTimeout(r, 600))
    }
  }

  const failed = results.filter((r) => !r.ok).length
  console.log(`\nDone. sent=${results.length - failed} failed=${failed}`)
  await mongoose.disconnect()
  if (failed) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
