import Subscriber from '@/models/Subscriber'
import { getNewsletterAlwaysTo } from '@/lib/email'
import { dispatchNewsletter } from '@/lib/server/newsletter-dispatcher'

type NewsletterRecipient = {
  email: string
  language?: string
  token?: string
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** One operator copy per campaign (not per subscriber). Skips if already on the recipient list. */
export async function sendNewsletterAlwaysToCopy(
  blog: Record<string, any>,
  alreadySentEmails: Iterable<string> = []
) {
  const sent = new Set(Array.from(alreadySentEmails, normalizeEmail).filter(Boolean))
  const alwaysTo = getNewsletterAlwaysTo()
  if (!alwaysTo.length) return []

  // Prefer real subscriber records so language + unsubscribe token match production mail.
  const subscriberDocs = await Subscriber.find({
    email: { $in: alwaysTo },
  })
    .select('email language token')
    .lean()
  const byEmail = new Map(
    subscriberDocs.map((s: any) => [normalizeEmail(s.email), s as NewsletterRecipient])
  )

  const recipients = alwaysTo
    .filter((email) => !sent.has(email))
    .map((email): NewsletterRecipient => {
      const existing = byEmail.get(email)
      return existing
        ? { email: existing.email, language: existing.language || 'en', token: existing.token }
        : { email, language: 'en' }
    })

  return dispatchNewsletter(blog, recipients)
}

export async function notifyBlogSubscribers(rawBlog: any) {
  try {
    const blog = typeof rawBlog?.toObject === 'function' ? rawBlog.toObject() : rawBlog
    if (!blog || !blog.slug) return

    const subscribers = await Subscriber.find({ unsubscribed: false, confirmed: true }).lean()
    const results = await dispatchNewsletter(blog, subscribers)
    const sentEmails = results.filter((r) => r.success).map((r) => r.email)

    // Always deliver one copy to NEWSLETTER_ALWAYS_TO so you can verify sends.
    await sendNewsletterAlwaysToCopy(blog, sentEmails)
  } catch (error) {
    console.error('Newsletter dispatch failed', error)
  }
}
