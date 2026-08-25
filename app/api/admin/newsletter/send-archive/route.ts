import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import BlogModel from '@/models/Blog'
import { getNewsletterAlwaysTo } from '@/lib/email'
import { dispatchNewsletter } from '@/lib/server/newsletter-dispatcher'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * One-shot: send every published blog as its own newsletter email
 * to NEWSLETTER_ALWAYS_TO only (not the subscriber list).
 *
 * POST /api/admin/newsletter/send-archive
 * Optional body: { language?: 'en' | 'es' }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin.ok) return admin.response

    const alwaysTo = getNewsletterAlwaysTo()
    if (!alwaysTo.length) {
      return NextResponse.json(
        { error: 'NEWSLETTER_ALWAYS_TO is not configured' },
        { status: 400 }
      )
    }

    let language: 'en' | 'es' = 'en'
    try {
      const body = await request.json()
      if (body?.language === 'es') language = 'es'
    } catch {
      // empty body is fine
    }

    await connectToDatabase()
    const blogs = await BlogModel.find({ published: true }).sort({ createdAt: 1 }).lean()
    if (!blogs.length) {
      return NextResponse.json({ error: 'No published blogs found' }, { status: 404 })
    }

    const results: Array<{ slug: string; email: string; success: boolean }> = []

    for (const blog of blogs) {
      const newsletterBlog = blog as Record<string, any>
      const recipients = alwaysTo.map((email) => ({ email, language }))
      const sent = await dispatchNewsletter(newsletterBlog, recipients, {
        paceMs: 400, // gentle pacing for Hostinger
      })
      for (const r of sent) {
        results.push({ slug: newsletterBlog.slug || String(newsletterBlog._id), email: r.email, success: r.success })
      }
    }

    const failed = results.filter((r) => !r.success)
    return NextResponse.json({
      blogs: blogs.length,
      sent: results.length - failed.length,
      failed: failed.map((f) => ({ slug: f.slug, email: f.email })),
      recipients: alwaysTo,
    })
  } catch (error) {
    console.error('Archive newsletter send failed', error)
    return NextResponse.json({ error: 'Failed to send archive newsletter' }, { status: 500 })
  }
}
