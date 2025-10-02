'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'

const STATUS_CONTENT: Record<string, { title: string; message: string; tone: 'success' | 'info' | 'error' }> = {
  success: {
    title: 'You are unsubscribed',
    message: 'We removed you from the newsletter. You can rejoin any time from a blog article.',
    tone: 'success'
  },
  'invalid-token': {
    title: 'This link has already been used',
    message: 'We could not find an active subscription for this link. It may have already been cancelled.',
    tone: 'info'
  },
  'missing-token': {
    title: 'Something is missing',
    message: 'We could not process your request because the unsubscribe link is incomplete.',
    tone: 'error'
  },
  error: {
    title: 'We could not unsubscribe you',
    message: 'Please try again in a moment or contact us so we can help.',
    tone: 'error'
  }
}

const TONE_ICON: Record<'success' | 'info' | 'error', string> = {
  success: '✅',
  info: 'ℹ️',
  error: '⚠️'
}

export function UnsubscribeStatusView() {
  const searchParams = useSearchParams()
  const status = searchParams?.get('status') ?? 'success'

  const content = useMemo(() => {
    return STATUS_CONTENT[status] ?? STATUS_CONTENT.success
  }, [status])

  return (
    <main className="min-h-screen bg-[#101825] flex items-center justify-center px-4 py-24">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">
          <span role="img" aria-hidden="true">{TONE_ICON[content.tone]}</span>
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
