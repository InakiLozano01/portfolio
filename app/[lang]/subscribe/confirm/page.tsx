import Link from 'next/link'
import { connectToDatabase } from '@/lib/mongodb'
import Subscriber from '@/models/Subscriber'
import { getDictionary } from '@/lib/dictionary'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

type ConfirmStatus = 'success' | 'invalid-token' | 'missing-token' | 'error'
type View = 'prompt' | ConfirmStatus

const STATUS_CONTENT: Record<ConfirmStatus, { title: string; message: string }> = {
  success: {
    title: 'Subscription confirmed',
    message: "You're all set — you'll receive an email whenever a new article is published."
  },
  'invalid-token': {
    title: 'This link is no longer valid',
    message: 'It may have already been used, or the subscription was cancelled. You can subscribe again from any blog article.'
  },
  'missing-token': {
    title: 'We could not confirm your subscription',
    message: 'The confirmation link is incomplete. Please use the link from the email we sent you.'
  },
  error: {
    title: 'Something went wrong',
    message: 'Please try again in a moment or contact us so we can help.'
  }
}

const STATUS_DICT_KEY: Record<ConfirmStatus, 'success' | 'invalidToken' | 'missingToken' | 'error'> = {
  success: 'success',
  'invalid-token': 'invalidToken',
  'missing-token': 'missingToken',
  error: 'error'
}

// READ-ONLY: never mutates on GET (so passive email link-scanners can't confirm).
// The actual confirmation happens only when the human submits the POST form below.
async function resolveView(token: string | undefined | null): Promise<View> {
  if (!token) {
    return 'missing-token'
  }
  try {
    await connectToDatabase()
    const subscriber = await Subscriber.findOne({ confirmToken: token }).lean()
    return subscriber ? 'prompt' : 'invalid-token'
  } catch (error) {
    console.error('Subscription confirmation lookup failed', error)
    return 'error'
  }
}

export default async function ConfirmSubscriptionPage({
  params,
  searchParams
}: {
  params: Promise<{ lang: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { lang } = await params
  const resolvedLang = lang === 'es' ? 'es' : 'en'
  const dict = await getDictionary(resolvedLang)
  const c = (dict as any).subscribeConfirm || {}
  const sp = searchParams ? await searchParams : {}
  const rawStatus = Array.isArray(sp.status) ? sp.status[0] : sp.status
  const rawToken = Array.isArray(sp.token) ? sp.token[0] : sp.token

  // A ?status= arrives only from our own POST redirect — display it directly.
  const view: View = (rawStatus && ['success', 'invalid-token', 'missing-token', 'error'].includes(rawStatus))
    ? (rawStatus as ConfirmStatus)
    : await resolveView(rawToken)

  if (view === 'prompt') {
    const p = c.prompt || {}
    return (
      <main className="min-h-screen bg-[#101825] flex items-center justify-center px-4 py-24">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">
            <span role="img" aria-hidden="true">✉️</span>
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-white mb-2">{p.title || 'Confirm your subscription'}</h1>
            <p className="text-slate-300 leading-relaxed">{p.message || "You're one step away. Confirm your email to start receiving new articles."}</p>
          </div>
          <form method="POST" action={`/api/subscribe/confirm?token=${encodeURIComponent(rawToken as string)}&lang=${resolvedLang}`}>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-white font-medium hover:bg-primary/90 transition"
            >
              {p.button || 'Confirm subscription'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  const content = STATUS_CONTENT[view]
  const statusDict = c.status?.[STATUS_DICT_KEY[view]] || {}

  return (
    <main className="min-h-screen bg-[#101825] flex items-center justify-center px-4 py-24">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">{statusDict.title || content.title}</h1>
          <p className="text-slate-300 mb-4 leading-relaxed">{statusDict.message || content.message}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={`/${resolvedLang}`}
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-white font-medium hover:bg-primary/90 transition"
          >
            {c.backToHome || 'Back to home'}
          </Link>
          <Link
            href={`/${resolvedLang}#blog`}
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-white font-medium hover:bg-white/10 transition"
          >
            {c.exploreBlogs || 'Explore blogs'}
          </Link>
        </div>
      </div>
    </main>
  )
}
