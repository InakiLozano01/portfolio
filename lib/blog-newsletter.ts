import Subscriber from '@/models/Subscriber'
import { sendNewsletterEmail } from '@/lib/email'

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')

const stringOrEmpty = (value: unknown): string =>
  typeof value === 'string' ? value : ''

const localizedField = (
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

const STRINGS: Record<'en' | 'es', NewsletterStrings> = {
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

const buildEmail = (
  blog: Record<string, any>,
  lang: 'en' | 'es',
  link: string,
  unsubscribeLink: string
) => {
  const strings = STRINGS[lang]
  const title = localizedField(blog, 'title', lang)
  const subtitle = localizedField(blog, 'subtitle', lang)

  const subject = `${strings.subjectPrefix}${title || blog.slug}`
  const htmlParts: string[] = []

  htmlParts.push(`<p>${strings.intro}</p>`)
  htmlParts.push(`<h2>${title}</h2>`)
  if (subtitle) {
    htmlParts.push(`<p>${subtitle}</p>`)
  }
  htmlParts.push(`<p><a href="${link}">${strings.cta}</a></p>`)
  htmlParts.push('<hr/>')
  htmlParts.push(`<p style="font-size:12px;color:#666">${strings.footerNote}</p>`)
  htmlParts.push(
    `<p style="font-size:12px;color:#666">${strings.unsubscribe} <a href="${unsubscribeLink}">${strings.unsubscribeLinkText}</a>.</p>`
  )

  const html = htmlParts.join('\n')

  return { subject, html }
}

export async function notifyBlogSubscribers(rawBlog: any) {
  try {
    const blog = typeof rawBlog?.toObject === 'function' ? rawBlog.toObject() : rawBlog
    if (!blog || !blog.slug) return

    const linkBase = baseUrl ? `${baseUrl}/blog/${blog.slug}` : `/blog/${blog.slug}`

    const subscribers = await Subscriber.find({ unsubscribed: false }).lean()
    if (!subscribers.length) return

    for (const sub of subscribers) {
      const lang: 'en' | 'es' = sub.language === 'es' ? 'es' : 'en'
      const unsubscribeLink = baseUrl
        ? `${baseUrl}/api/subscribe/unsubscribe?token=${encodeURIComponent(sub.token)}`
        : `/api/subscribe/unsubscribe?token=${encodeURIComponent(sub.token)}`

      const { subject, html } = buildEmail(blog, lang, linkBase, unsubscribeLink)
      await sendNewsletterEmail({ to: sub.email, subject, html })
    }
  } catch (error) {
    console.error('Newsletter dispatch failed', error)
  }
}

