import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import BlogModel from '@/models/Blog'
import Subscriber from '@/models/Subscriber'
import { dispatchNewsletter } from '@/lib/server/newsletter-dispatcher'
import { sendNewsletterAlwaysToCopy } from '@/lib/server/blog-newsletter'
import { requireAdmin } from '@/lib/admin-auth'

const MAX_MANUAL_NEWSLETTER_RECIPIENTS = 100
const MANUAL_NEWSLETTER_CONCURRENCY = 3
const MANUAL_NEWSLETTER_DEADLINE_MS = 30_000

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params

    try {
        const admin = await requireAdmin(request)
        if (!admin.ok) return admin.response

        const { subscriberIds } = await request.json() as { subscriberIds: string[] }
        const uniqueSubscriberIds = Array.isArray(subscriberIds) ? Array.from(new Set(subscriberIds)) : []
        if (uniqueSubscriberIds.length === 0) {
            return NextResponse.json({ error: 'No recipients selected' }, { status: 400 })
        }
        if (uniqueSubscriberIds.length > MAX_MANUAL_NEWSLETTER_RECIPIENTS) {
            return NextResponse.json({ error: `Select ${MAX_MANUAL_NEWSLETTER_RECIPIENTS} recipients or fewer` }, { status: 400 })
        }

        await connectToDatabase()

        const blog = await BlogModel.findById(id).lean()
        if (!blog) {
            return NextResponse.json({ error: 'Blog not found' }, { status: 404 })
        }
        const newsletterBlog = blog as Record<string, any>

        const subscribers = await Subscriber.find({ _id: { $in: uniqueSubscriberIds }, unsubscribed: false, confirmed: true }).lean()
        if (!subscribers.length) {
            return NextResponse.json({ error: 'No active (confirmed) subscribers for selection' }, { status: 400 })
        }

        const results = await dispatchNewsletter(newsletterBlog, subscribers, {
            concurrency: MANUAL_NEWSLETTER_CONCURRENCY,
            deadlineMs: MANUAL_NEWSLETTER_DEADLINE_MS,
        })

        const alwaysToResults = await sendNewsletterAlwaysToCopy(
            newsletterBlog,
            results.filter((r) => r.success).map((r) => r.email)
        )
        for (const r of alwaysToResults) {
            results.push(r)
        }

        const failed = results.filter((r) => !r.success)

        return NextResponse.json({
            sent: results.length - failed.length,
            failed: failed.map((f) => f.email)
        })
    } catch (error) {
        console.error('Manual newsletter send failed', error)
        return NextResponse.json({ error: 'Failed to send newsletter' }, { status: 500 })
    }
}
