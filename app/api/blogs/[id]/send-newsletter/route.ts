import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import BlogModel from '@/models/Blog'
import Subscriber from '@/models/Subscriber'
import { sendNewsletterEmail } from '@/lib/email'
import { buildNewsletterEmail } from '@/lib/newsletter-template'
import { requireAdmin } from '@/lib/admin-auth'

const MAX_MANUAL_NEWSLETTER_RECIPIENTS = 100

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

        const subscribers = await Subscriber.find({ _id: { $in: uniqueSubscriberIds }, unsubscribed: false }).lean()
        if (!subscribers.length) {
            return NextResponse.json({ error: 'No active subscribers for selection' }, { status: 400 })
        }

        const results = await Promise.all(subscribers.map(async (subscriber) => {
            const { subject, html, text, attachments } = buildNewsletterEmail(blog, subscriber)
            const success = await sendNewsletterEmail({ to: subscriber.email, subject, html, text, attachments })
            return { email: subscriber.email, success }
        }))

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
