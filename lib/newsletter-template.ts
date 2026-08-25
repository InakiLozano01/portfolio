import DOMPurify from 'isomorphic-dompurify'

const rawBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim()

const baseUrl = (() => {
  const fallback = 'https://inakilozano.com'
  if (!rawBaseUrl) {
    return fallback
  }
  const ensureProtocol = rawBaseUrl.startsWith('http') ? rawBaseUrl : `https://${rawBaseUrl}`
  try {
    const url = new URL(ensureProtocol)
    if (url.hostname === '0.0.0.0' || url.hostname === 'localhost') {
      return fallback
    }
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch (_error) {
    return fallback
  }
})()

const stringOrEmpty = (value: unknown): string =>
  typeof value === 'string' ? value : ''

const escapeHtml = (value: unknown) =>
  stringOrEmpty(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const localizedField = (
  blog: Record<string, any>,
  field: string,
  lang: 'en' | 'es'
): string => {
  const english = stringOrEmpty(blog[`${field}_en`]).trim() || stringOrEmpty(blog[field]).trim()
  const spanish = stringOrEmpty(blog[`${field}_es`]).trim() || english
  return lang === 'es'
    ? spanish || english
    : english || spanish
}

// Brand palette (hard-coded — email clients can't read CSS variables).
const NAVY = '#1a2433'
const MAROON = '#800020'
const LOGO_SRC = `${baseUrl}/il-logo-mark.png`

type NewsletterStrings = {
  subjectPrefix: string
  eyebrow: string
  readingTime: (m: number) => string
  readOnSite: string
  downloadPdf: string
  footerNote: string
  unsubscribePrefix: string
  unsubscribeLinkText: string
  signature: string
}

export const STRINGS: Record<'en' | 'es', NewsletterStrings> = {
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

type ConfirmStrings = {
  subject: string
  eyebrow: string
  heading: string
  body: string
  cta: string
  ignore: string
  signature: string
}

const CONFIRM_STRINGS: Record<'en' | 'es', ConfirmStrings> = {
  en: {
    subject: 'Confirm your subscription',
    eyebrow: 'One last step',
    heading: 'Confirm your subscription',
    body: "Thanks for subscribing to Iñaki F. Lozano's blog. Please confirm your email address to start receiving new articles — you'll only hear from me when something new is published.",
    cta: 'Confirm subscription',
    ignore: "If you didn't request this, you can safely ignore this email and nothing will happen.",
    signature: '— Iñaki F. Lozano',
  },
  es: {
    subject: 'Confirmá tu suscripción',
    eyebrow: 'Un último paso',
    heading: 'Confirmá tu suscripción',
    body: 'Gracias por suscribirte al blog de Iñaki F. Lozano. Confirmá tu dirección de correo para empezar a recibir los nuevos artículos: solo te escribiré cuando publique algo nuevo.',
    cta: 'Confirmar suscripción',
    ignore: 'Si no solicitaste esto, podés ignorar este correo de forma segura y no pasará nada.',
    signature: '— Iñaki F. Lozano',
  },
}

const absolutizeUrl = (value: string): string => {
  const raw = stringOrEmpty(value).trim()
  if (!raw) return raw
  if (/^https?:\/\//i.test(raw) || raw.startsWith('cid:') || raw.startsWith('data:')) return raw
  if (raw.startsWith('//')) return `https:${raw}`
  return `${baseUrl}${raw.startsWith('/') ? '' : '/'}${raw}`
}

const absolutizeImages = (html: string): string =>
  html
    .replace(/(<img\b[^>]*\bsrc=")([^"]*)(")/gi, (_m, pre, src, post) => `${pre}${absolutizeUrl(src)}${post}`)
    .replace(/(<a\b[^>]*\bhref=")(\/[^"]*)(")/gi, (_m, pre, href, post) => `${pre}${absolutizeUrl(href)}${post}`)

// Keep only email-safe CSS declarations from TinyMCE (alignment, spacing, color).
const sanitizeInlineStyle = (style: string): string => {
  const allowed = new Set([
    'text-align',
    'display',
    'margin',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'width',
    'max-width',
    'height',
    'max-height',
    'color',
    'background-color',
    'font-style',
    'font-weight',
    'font-size',
    'line-height',
    'border',
    'border-left',
    'border-radius',
  ])
  return stringOrEmpty(style)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf(':')
      if (idx === -1) return ''
      const prop = part.slice(0, idx).trim().toLowerCase()
      const val = part.slice(idx + 1).trim()
      if (!allowed.has(prop) || !val) return ''
      // Block urls/expressions in styles (images use src=, not background url()).
      if (/url\s*\(|expression\s*\(|javascript:/i.test(val)) return ''
      return `${prop}: ${val}`
    })
    .filter(Boolean)
    .join('; ')
}

const enhanceEmailImages = (html: string): string =>
  html.replace(/<img\b([^>]*)>/gi, (_m, attrs: string) => {
    const srcMatch = attrs.match(/\bsrc=(["'])(.*?)\1/i)
    const altMatch = attrs.match(/\balt=(["'])(.*?)\1/i)
    const styleMatch = attrs.match(/\bstyle=(["'])(.*?)\1/i)
    const widthMatch = attrs.match(/\bwidth=(["'])?(.*?)\1?(?:\s|>|$)/i)
    const src = srcMatch ? absolutizeUrl(srcMatch[2]) : ''
    if (!src) return ''
    const alt = altMatch ? altMatch[2] : ''
    const width = widthMatch ? widthMatch[2].replace(/["']/g, '').trim() : ''
    const existing = sanitizeInlineStyle(styleMatch ? styleMatch[2] : '')
    const baseStyle =
      'display:block;max-width:100%;height:auto;margin:18px auto;border-radius:8px;'
    const style = existing ? `${baseStyle}${existing}` : baseStyle
    const widthAttr = width && /^\d+$/.test(width) ? ` width="${width}"` : ''
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${widthAttr} style="${escapeHtml(style)}" />`
  })

// Sanitize TinyMCE article HTML for email: keep semantic prose + safe inline styles
// (justify/center) and images. Drop scripts, iframes, video, math.
const sanitizeArticleHtml = (html: string): string => {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'b', 'em', 'i', 'u', 's', 'a', 'span', 'div',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'img', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'width', 'height', 'style'],
    FORBID_TAGS: ['script', 'iframe', 'video', 'audio', 'source', 'math'],
    ALLOW_DATA_ATTR: false,
  })

  // Re-sanitize every style= after DOMPurify (defense in depth).
  const withSafeStyles = clean.replace(
    /\sstyle=(["'])(.*?)\1/gi,
    (_m, _q, style: string) => {
      const safe = sanitizeInlineStyle(style)
      return safe ? ` style="${safe}"` : ''
    }
  )

  return enhanceEmailImages(absolutizeImages(withSafeStyles))
}

const computeReadingMinutes = (html: string): number => {
  const text = stringOrEmpty(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const words = text ? text.split(' ').length : 0
  return Math.max(1, Math.round(words / 200))
}

const formatDate = (value: unknown, lang: 'en' | 'es'): string => {
  if (!value) return ''
  const d = new Date(value as any)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

// Shared <style> block — applied in clients that honour <style> (Apple Mail,
// Outlook desktop, etc.). Gmail strips it but inherits the inline body styles,
// so prose still reads cleanly everywhere.
const ARTICLE_STYLE = `
    .il-article { color:#1f2937; font-size:16px; line-height:1.75; text-align:justify; }
    .il-article p { margin:0 0 18px; text-align:justify; }
    .il-article p[style*="text-align: left"],
    .il-article p[style*="text-align:left"] { text-align:left !important; }
    .il-article p[style*="text-align: center"],
    .il-article p[style*="text-align:center"] { text-align:center !important; }
    .il-article p[style*="text-align: right"],
    .il-article p[style*="text-align:right"] { text-align:right !important; }
    .il-article h1,.il-article h2,.il-article h3,.il-article h4 { color:${NAVY}; line-height:1.3; margin:28px 0 12px; font-weight:700; text-align:left; }
    .il-article h2 { font-size:22px; } .il-article h3 { font-size:19px; } .il-article h4 { font-size:17px; }
    .il-article a { color:${MAROON}; text-decoration:underline; }
    .il-article img { display:block; max-width:100%; height:auto; border-radius:8px; margin:18px auto; }
    .il-article figure { margin:18px 0; text-align:center; }
    .il-article figcaption { margin-top:8px; font-size:13px; color:#6b7280; text-align:center; font-style:italic; }
    .il-article ul,.il-article ol { margin:0 0 18px; padding-left:22px; text-align:left; }
    .il-article li { margin:0 0 8px; }
    .il-article blockquote { margin:0 0 18px; padding:10px 18px; border-left:3px solid ${MAROON}; background:#faf5f6; color:#374151; font-style:italic; text-align:left; }
    .il-article pre { background:#0f172a; color:#e2e8f0; padding:14px 16px; border-radius:8px; overflow:auto; font-size:14px; line-height:1.5; text-align:left; }
    .il-article code { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:14px; }
    .il-article table { width:100%; border-collapse:collapse; margin:0 0 18px; }
    .il-article th,.il-article td { border:1px solid #e5e7eb; padding:8px 10px; text-align:left; font-size:14px; }
    .il-article hr { border:0; border-top:1px solid #e5e7eb; margin:24px 0; }
`

const button = (href: string, label: string, variant: 'solid' | 'outline'): string => {
  const solid = `background-color:${MAROON};color:#ffffff;border:2px solid ${MAROON};`
  const outline = `background-color:#ffffff;color:${MAROON};border:2px solid ${MAROON};`
  return `
                    <td align="center" style="border-radius:999px;${variant === 'solid' ? solid : outline}">
                      <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:18px;text-decoration:none;font-weight:600;color:inherit;">${escapeHtml(label)}</a>
                    </td>`
}

const shell = (lang: 'en' | 'es', preheader: string, title: string, inner: string, footer: string): string => `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>${escapeHtml(title)}</title>
    <style>${ARTICLE_STYLE}</style>
  </head>
  <body style="margin:0;padding:0;background-color:#eef0f5;-webkit-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background-color:#eef0f5;">
      <tr>
        <td align="center" style="padding:28px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;border-collapse:collapse;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 40px rgba(20,30,60,0.14);">
${inner}
            <tr>
              <td align="center" style="padding:26px 28px;background-color:#0f172a;color:#cbd5e1;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;">
${footer}
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#94a3b8;">Iñaki F. Lozano · Tucumán, Argentina</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

const header = (lang: 'en' | 'es', eyebrow: string, title: string, subtitle: string, meta?: string): string => `
            <tr>
              <td align="center" style="padding:38px 30px 30px;background:linear-gradient(135deg,${NAVY},${MAROON});color:#ffffff;">
                <img src="${LOGO_SRC}" alt="Iñaki F. Lozano" width="56" height="56" style="display:block;margin:0 auto 18px;" />
                <p style="margin:0 0 10px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:16px;color:rgba(255,255,255,0.72);text-transform:uppercase;letter-spacing:2px;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:27px;line-height:34px;font-weight:700;color:#ffffff;">${escapeHtml(title)}</h1>
                ${subtitle ? `<p style="margin:12px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:rgba(255,255,255,0.85);">${escapeHtml(subtitle)}</p>` : ''}
                ${meta ? `<p style="margin:16px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:18px;color:rgba(255,255,255,0.6);">${escapeHtml(meta)}</p>` : ''}
              </td>
            </tr>`

export const buildNewsletterEmail = (
  blog: Record<string, any>,
  subscriber: { email: string; language?: string; token?: string }
) => {
  const lang: 'en' | 'es' = subscriber.language === 'es' ? 'es' : 'en'
  const strings = STRINGS[lang]

  const title = localizedField(blog, 'title', lang)
  const subtitle = localizedField(blog, 'subtitle', lang)
  const rawContent = localizedField(blog, 'content', lang)
  const rawFooter = localizedField(blog, 'footer', lang)
  const rawBibliography = localizedField(blog, 'bibliography', lang)

  const articleHtml = sanitizeArticleHtml(rawContent)
  const footerHtml = rawFooter ? sanitizeArticleHtml(rawFooter) : ''
  const bibliographyHtml = rawBibliography ? sanitizeArticleHtml(rawBibliography) : ''

  const readingMinutes = computeReadingMinutes(rawContent)
  const dateLabel = formatDate(blog.createdAt, lang)
  const metaParts = [dateLabel, strings.readingTime(readingMinutes)].filter(Boolean)

  const articleUrl = `${baseUrl}/${lang}/blog/${encodeURIComponent(blog.slug)}`
  const unsubscribeUrl = `${baseUrl}/${lang}/unsubscribe${subscriber.token ? `?token=${encodeURIComponent(subscriber.token)}` : ''}`
  // RFC 8058 one-click endpoint (accepts POST) for the List-Unsubscribe-Post header.
  const listUnsubscribeUrl = subscriber.token
    ? `${baseUrl}/api/subscribe/unsubscribe?token=${encodeURIComponent(subscriber.token)}`
    : undefined
  const pdfPath = lang === 'es' ? blog.pdf_es : blog.pdf_en
  const pdfUrl = typeof pdfPath === 'string' && pdfPath.trim()
    ? (pdfPath.startsWith('http') ? pdfPath : `${baseUrl}${pdfPath.startsWith('/') ? '' : '/'}${pdfPath}`)
    : null

  const subject = `${strings.subjectPrefix}${title || blog.slug}`
  const preheader = subtitle || `${strings.readingTime(readingMinutes)} · ${title}`

  const ctas = `
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 4px;">
                  <tr>
${button(articleUrl, strings.readOnSite, 'solid')}
                    ${pdfUrl ? `<td style="width:12px;">&nbsp;</td>` : ''}
                    ${pdfUrl ? button(pdfUrl, strings.downloadPdf, 'outline') : ''}
                  </tr>
                </table>`

  const articleInline =
    'color:#1f2937;font-size:16px;line-height:1.75;font-family:Georgia,Times New Roman,serif;text-align:justify;'
  const inner = `${header(lang, strings.eyebrow, title, subtitle, metaParts.join('  ·  '))}
            <tr>
              <td style="padding:34px 30px 8px;font-family:Helvetica,Arial,sans-serif;">
                <div class="il-article" style="${articleInline}">${articleHtml}</div>
                ${footerHtml ? `<div class="il-article" style="margin-top:12px;${articleInline}">${footerHtml}</div>` : ''}
                ${bibliographyHtml ? `<hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;" /><div class="il-article" style="color:#4b5563;font-size:14px;line-height:1.65;font-family:Helvetica,Arial,sans-serif;text-align:left;">${bibliographyHtml}</div>` : ''}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 30px 36px;">${ctas}</td>
            </tr>`

  const footer = `
                <p style="margin:0 0 8px;color:#cbd5e1;">${escapeHtml(strings.footerNote)}</p>
                <p style="margin:0 0 14px;color:#cbd5e1;">${escapeHtml(strings.unsubscribePrefix)} <a href="${escapeHtml(unsubscribeUrl)}" style="color:#fbbf24;text-decoration:none;font-weight:600;">${escapeHtml(strings.unsubscribeLinkText)}</a></p>
                <p style="margin:0;font-style:italic;color:#94a3b8;">${escapeHtml(strings.signature)}</p>`

  const html = shell(lang, preheader, subject, inner, footer)

  const text = [
    title,
    subtitle,
    metaParts.join(' · '),
    '',
    rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    '',
    `${strings.readOnSite}: ${articleUrl}`,
    pdfUrl ? `${strings.downloadPdf}: ${pdfUrl}` : '',
    '',
    `${strings.unsubscribePrefix} ${unsubscribeUrl}`,
  ].filter((line) => line !== undefined).join('\n')

  return { subject, html, text, attachments: undefined as undefined, unsubscribeUrl, listUnsubscribeUrl }
}

export const buildConfirmationEmail = (
  subscriber: { email: string; language?: string; confirmToken?: string }
) => {
  const lang: 'en' | 'es' = subscriber.language === 'es' ? 'es' : 'en'
  const s = CONFIRM_STRINGS[lang]
  const confirmUrl = `${baseUrl}/${lang}/subscribe/confirm${subscriber.confirmToken ? `?token=${encodeURIComponent(subscriber.confirmToken)}` : ''}`

  const inner = `${header(lang, s.eyebrow, s.heading, '')}
            <tr>
              <td style="padding:34px 32px 8px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#1f2937;">
                <p style="margin:0 0 24px;">${escapeHtml(s.body)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
                  <tr>
${button(confirmUrl, s.cta, 'solid')}
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#6b7280;text-align:center;">${escapeHtml(s.ignore)}</p>
              </td>
            </tr>
            <tr><td style="height:24px;line-height:24px;">&nbsp;</td></tr>`

  const footer = `<p style="margin:0;font-style:italic;color:#94a3b8;">${escapeHtml(s.signature)}</p>`

  const html = shell(lang, s.body.slice(0, 120), s.subject, inner, footer)
  const text = `${s.heading}\n\n${s.body}\n\n${s.cta}: ${confirmUrl}\n\n${s.ignore}`

  return { subject: s.subject, html, text }
}
