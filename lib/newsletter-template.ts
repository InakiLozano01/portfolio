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

type NewsletterStrings = {
  subjectPrefix: string
  intro: string
  cta: string
  footerNote: string
  unsubscribe: string
  unsubscribeLinkText: string
}

export const STRINGS: Record<'en' | 'es', NewsletterStrings> = {
  en: {
    subjectPrefix: 'New blog: ',
    intro: 'A new blog has been published:',
    cta: 'Read it here',
    footerNote: 'You can unsubscribe at any time.',
    unsubscribe: 'If you wish to unsubscribe,',
    unsubscribeLinkText: 'click here'
  },
  es: {
    subjectPrefix: 'Nuevo blog: ',
    intro: 'Se publico un nuevo blog:',
    cta: 'Leelo aqui',
    footerNote: 'Puedes darte de baja en cualquier momento.',
    unsubscribe: 'Si deseas darte de baja,',
    unsubscribeLinkText: 'haz clic aqui'
  }
}

const heroImageFromBlog = (blog: Record<string, any>): string | null => {
  const candidate = [blog.heroImage, blog.coverImage].find((value) => typeof value === 'string' && value.trim())
  return candidate?.trim() ?? null
}

const toOptimizedImageUrl = (imageUrl: string | null): string | null => {
  if (!imageUrl) return null
  const trimmed = imageUrl.trim()
  if (!trimmed) return null
  try {
    const absolute = trimmed.startsWith('http') ? trimmed : `${baseUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
    const absoluteUrl = new URL(absolute)
    const sameOrigin = absoluteUrl.origin === baseUrl
    const target = sameOrigin ? `${absoluteUrl.pathname}${absoluteUrl.search}` || '/' : absoluteUrl.toString()
    const encodedTarget = encodeURIComponent(target)
    return `${baseUrl}/_next/image?url=${encodedTarget}&w=1200&q=75`
  } catch (_error) {
    return trimmed
  }
}

const LOGO_SRC = `${baseUrl}/inakilozanodotcomlogo.png`

export const buildNewsletterEmail = (
  blog: Record<string, any>,
  subscriber: { email: string; language?: string; token?: string }
) => {
  const lang: 'en' | 'es' = subscriber.language === 'es' ? 'es' : 'en'
  const linkBase = baseUrl ? `${baseUrl}/blog/${blog.slug}` : `/blog/${blog.slug}`
  const unsubscribeLink = baseUrl
    ? `${baseUrl}/unsubscribe${subscriber.token ? `?token=${encodeURIComponent(subscriber.token)}` : ''}`
    : `/unsubscribe${subscriber.token ? `?token=${encodeURIComponent(subscriber.token)}` : ''}`

  const strings = STRINGS[lang]
  const title = localizedField(blog, 'title', lang)
  const subtitle = localizedField(blog, 'subtitle', lang)
  const subject = `${strings.subjectPrefix}${title || blog.slug}`

  const heroImage = toOptimizedImageUrl(heroImageFromBlog(blog))

  const logoSource = LOGO_SRC

  const heroSection = heroImage
    ? `
              <tr>
                <td style="padding:0;">
                  <img src="${heroImage}" alt="${title}" style="display:block;width:100%;height:auto;" />
                </td>
              </tr>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f6f7fb;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background-color:#f6f7fb;">
      <tr>
        <td align="center" style="padding:24px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;border-collapse:collapse;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 15px 35px rgba(20,30,60,0.12);">
            <tr>
              <td align="center" style="padding:36px 28px;background:linear-gradient(135deg,#1a2433,#800020);color:#ffffff;">
                <img src="${logoSource}" alt="Iñaki Lozano logo" width="88" height="88" style="border-radius:20px;margin-bottom:16px;border:2px solid rgba(255,255,255,0.2);display:block;" />
                <p style="margin:0 0 12px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:1px;">${strings.intro}</p>
                <h1 style="margin:0 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:26px;line-height:32px;font-weight:700;">${title}</h1>
                ${subtitle ? `<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;color:rgba(255,255,255,0.85);">${subtitle}</p>` : ''}
              </td>
            </tr>
            ${heroSection}
            <tr>
              <td style="padding:32px 28px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:26px;color:#1f2937;">
                ${blog.summary ? `<p style="margin:0 0 24px;">${blog.summary}</p>` : ''}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td align="center" style="border-radius:999px;background-color:#800020;">
                      <a href="${linkBase}" style="display:inline-block;padding:14px 28px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:20px;color:#ffffff;text-decoration:none;font-weight:600;">${strings.cta}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 24px;background-color:#0f172a;color:#e2e8f0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;">
                <p style="margin:0 0 8px;">${strings.footerNote}</p>
                <p style="margin:0 0 12px;">${strings.unsubscribe} <a href="${unsubscribeLink}" style="color:#fbbf24;text-decoration:none;font-weight:600;">${strings.unsubscribeLinkText}</a>.</p>
                <p style="margin:0;font-style:italic;color:#cbd5f5;">— Iñaki F. Lozano</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return {
    subject,
    html,
    text: `${strings.intro} ${title}\n\n${strings.cta}: ${linkBase}\n\n${strings.footerNote}`,
    attachments: undefined
  }
}
