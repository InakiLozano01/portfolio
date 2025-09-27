import { LOGO_DATA_URL } from '@/lib/assets/logo-base64'

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')

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

const LOGO_SRC = LOGO_DATA_URL

export const buildNewsletterEmail = (
  blog: Record<string, any>,
  subscriber: { email: string; language?: string; token?: string }
) => {
  const lang: 'en' | 'es' = subscriber.language === 'es' ? 'es' : 'en'
  const linkBase = baseUrl ? `${baseUrl}/blog/${blog.slug}` : `/blog/${blog.slug}`
  const unsubscribeLink = baseUrl
    ? `${baseUrl}/api/subscribe/unsubscribe?token=${encodeURIComponent(subscriber.token ?? '')}`
    : `/api/subscribe/unsubscribe?token=${encodeURIComponent(subscriber.token ?? '')}`

  const strings = STRINGS[lang]
  const title = localizedField(blog, 'title', lang)
  const subtitle = localizedField(blog, 'subtitle', lang)
  const subject = `${strings.subjectPrefix}${title || blog.slug}`

  const heroImage = heroImageFromBlog(blog)

  const logoSource = LOGO_SRC

  const html = `
  <!DOCTYPE html>
  <html lang="${lang}">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${subject}</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background:#f6f7fb; color:#1a1a1a; margin:0; padding:0; }
        .container { max-width:640px; margin:0 auto; background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 15px 35px rgba(20,30,60,0.12); }
        .header { background:linear-gradient(135deg,#1a2433,#800020); color:#fff; padding:36px 32px; text-align:center; }
        .header h1 { margin:0; font-size:28px; letter-spacing:0.5px; }
        .meta { color:rgba(255,255,255,0.7); margin-top:10px; font-size:14px; }
        .hero img { width:100%; height:auto; display:block; }
        .content { padding:32px; line-height:1.7; font-size:16px; color:#1f2937; }
        .content h2 { font-size:24px; margin-bottom:12px; color:#111827; }
        .content p { margin:16px 0; }
        .cta { text-align:center; margin:32px 0; }
        .cta a { background:#800020; color:#fff!important; padding:14px 28px; border-radius:999px; font-weight:600; text-decoration:none; letter-spacing:0.3px; box-shadow:0 10px 20px rgba(128,0,32,0.25); display:inline-block; }
        .footer { background:#0f172a; color:#e2e8f0; padding:28px 32px; font-size:13px; text-align:center; }
        .footer a { color:#fbbf24; text-decoration:none; font-weight:600; }
        .signature { margin-top:24px; font-style:italic; color:#cbd5f5; }
      </style>
    </head>
    <body>
      <table class="container" role="presentation" cellPadding="0" cellSpacing="0">
        <tr>
          <td>
            <div class="header">
              <img src="${logoSource}" alt="Iñaki Lozano logo" width="72" height="72" style="border-radius:16px;margin-bottom:16px;border:2px solid rgba(255,255,255,0.2);" />
              <h1>${title}</h1>
              <div class="meta">${strings.intro}</div>
            </div>
            ${heroImage ? `<div class="hero"><img src="${heroImage}" alt="${title}" /></div>` : ''}
            <div class="content">
              ${subtitle ? `<p>${subtitle}</p>` : ''}
              ${blog.summary ? `<p>${blog.summary}</p>` : ''}
              <div class="cta">
                <a href="${linkBase}">${strings.cta}</a>
              </div>
            </div>
            <div class="footer">
              <p>${strings.footerNote}</p>
              <p>${strings.unsubscribe} <a href="${unsubscribeLink}">${strings.unsubscribeLinkText}</a>.</p>
              <div class="signature">— Iñaki F. Lozano</div>
            </div>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `

  return {
    subject,
    html,
    text: `${strings.intro} ${title}\n\n${strings.cta}: ${linkBase}\n\n${strings.footerNote}`,
    attachments: [
      {
        filename: 'logo.png',
        path: LOGO_DATA_URL,
        cid: 'site-logo'
      }
    ]
  }
}
