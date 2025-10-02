import Link from 'next/link'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { connectToDatabase } from '@/lib/mongodb'
import Subscriber from '@/models/Subscriber'

const STATUS_CONTENT: Record<string, { title: string; message: string; icon: string }> = {
  success: {
    title: 'You are unsubscribed',
    message: 'We removed you from the newsletter. You can rejoin any time from a blog article.',
    icon: '✅'
  },
  'invalid-token': {
    title: 'This link has already been used',
    message: 'We could not find an active subscription for this link. It may have already been cancelled.',
    icon: 'ℹ️'
  },
  'missing-token': {
    title: 'We could not process this request',
    message: 'The unsubscribe link is incomplete. Please use the link provided in your email.',
    icon: '⚠️'
  },
  error: {
    title: 'We could not unsubscribe you',
    message: 'Please try again in a moment or contact us so we can help.',
    icon: '⚠️'
  }
}

async function resolveStatus(token: string | undefined | null): Promise<'success' | 'invalid-token' | 'missing-token' | 'error'> {
  if (!token) {
    return 'missing-token'
  }

  try {
    await connectToDatabase()
    const subscriber = await Subscriber.findOne({ token })
    if (!subscriber) {
      return 'invalid-token'
    }
    if (!subscriber.unsubscribed) {
      subscriber.unsubscribed = true
      await subscriber.save()
    }
    return 'success'
  } catch (error) {
    console.error('Unsubscribe processing failed', error)
    return 'error'
  }
}

export default async function UnsubscribePage({
  searchParams
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const rawToken = searchParams?.token
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken
  const status = await resolveStatus(token)
  const content = STATUS_CONTENT[status]

  return (
    <main className="min-h-screen bg-[#101825] flex items-center justify-center px-4 py-24">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">
          <span role="img" aria-hidden="true">{content.icon}</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">{content.title}</h1>
          <p className="text-slate-300 mb-4 leading-relaxed">{content.message}</p>
          <p className="text-sm text-slate-500">If this was a mistake, you can resubscribe from any blog article.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-white font-medium hover:bg-primary/90 transition"
          >
            Back to home
          </Link>
          <Link
            href="/blog"
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-white font-medium hover:bg-white/10 transition"
          >
            Explore blogs
          </Link>
        </div>
      </div>
    </main>
  )
}
