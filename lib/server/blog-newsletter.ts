import Subscriber from '@/models/Subscriber'
import { sendNewsletterEmail } from '@/lib/email'
import { buildNewsletterEmail } from '@/lib/blog-newsletter'

export async function notifyBlogSubscribers(rawBlog: any) {
  try {
    const blog = typeof rawBlog?.toObject === 'function' ? rawBlog.toObject() : rawBlog
    if (!blog || !blog.slug) return

    const subscribers = await Subscriber.find({ unsubscribed: false, confirmed: true }).lean()
    if (!subscribers.length) return

    for (const sub of subscribers) {
      const { subject, html, text, attachments, listUnsubscribeUrl } = buildNewsletterEmail(blog, sub)
      await sendNewsletterEmail({ to: sub.email, subject, html, text, attachments, listUnsubscribe: listUnsubscribeUrl })
    }
  } catch (error) {
    console.error('Newsletter dispatch failed', error)
  }
}
