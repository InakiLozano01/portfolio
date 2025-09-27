import Subscriber from '@/models/Subscriber'
import { sendNewsletterEmail } from '@/lib/email'
import { buildNewsletterEmailHtml, localizedField, STRINGS } from '@/lib/newsletter-template'
import { LOGO_DATA_URL } from '@/lib/assets/logo-base64'

export async function notifyBlogSubscribers(rawBlog: any) {
  try {
    const blog = typeof rawBlog?.toObject === 'function' ? rawBlog.toObject() : rawBlog
    if (!blog || !blog.slug) return

    const subscribers = await Subscriber.find({ unsubscribed: false }).lean()
    if (!subscribers.length) return

    for (const sub of subscribers) {
      const { subject, html, text, attachments } = buildNewsletterEmail(blog, sub)
      await sendNewsletterEmail({ to: sub.email, subject, html, text, attachments })
    }
  } catch (error) {
    console.error('Newsletter dispatch failed', error)
  }
}

export const buildNewsletterEmail = (
  blog: Record<string, any>,
  subscriber: { email: string; language?: string; token?: string } // Modified signature
) => {
  const lang: 'en' | 'es' = subscriber.language === 'es' ? 'es' : 'en'
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const linkBase = baseUrl ? `${baseUrl}/blog/${blog.slug}` : `/blog/${blog.slug}`
  const unsubscribeLink = baseUrl
    ? `${baseUrl}/api/subscribe/unsubscribe?token=${encodeURIComponent(subscriber.token ?? '')}`
    : `/api/subscribe/unsubscribe?token=${encodeURIComponent(subscriber.token ?? '')}`

  const strings = STRINGS[lang]
  const title = localizedField(blog, 'title', lang)
  const subtitle = localizedField(blog, 'subtitle', lang)
  const subject = `${strings.subjectPrefix}${title || blog.slug}`

  const heroImage = blog.heroImage || blog.coverImage || LOGO_DATA_URL

  const html = buildNewsletterEmailHtml(blog, strings, linkBase, unsubscribeLink, title, subtitle, heroImage)

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

