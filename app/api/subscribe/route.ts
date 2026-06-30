'use server'

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Subscriber from '@/models/Subscriber'
import { sendNewsletterEmail } from '@/lib/email'
import { buildConfirmationEmail } from '@/lib/newsletter-template'
import { getClientIp } from '@/lib/client-ip'
import { randomUUID } from 'crypto'

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const MAX_SUBSCRIBE_REQUESTS_PER_IP = 20
const MAX_SUBSCRIBE_REQUESTS_PER_EMAIL = 5
const SWEEP_THRESHOLD = 5000
const subscribeAttempts = new Map<string, { count: number; resetAt: number }>()

// Evict expired entries so the Map can't grow without bound (it would otherwise
// leak one entry per distinct ip/email key until the container OOMs).
function sweepExpired(now: number) {
  for (const [key, value] of subscribeAttempts) {
    if (value.resetAt <= now) subscribeAttempts.delete(key)
  }
}

function isRateLimited(key: string, maxRequests: number) {
  const now = Date.now()
  if (subscribeAttempts.size > SWEEP_THRESHOLD) sweepExpired(now)
  const current = subscribeAttempts.get(key)
  if (!current || current.resetAt <= now) {
    subscribeAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  current.count += 1
  return current.count > maxRequests
}

async function sendConfirmation(subscriber: { email: string; language?: string; confirmToken?: string }) {
  try {
    const { subject, html, text } = buildConfirmationEmail(subscriber)
    await sendNewsletterEmail({ to: subscriber.email, subject, html, text })
  } catch (err) {
    // Best-effort: the subscriber stays pending and can re-request the link by subscribing again.
    console.error('Confirmation email failed', err)
  }
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    if (isRateLimited(`ip:${ip}`, MAX_SUBSCRIBE_REQUESTS_PER_IP)) {
      return NextResponse.json({ error: 'Too many subscribe attempts' }, { status: 429 })
    }

    const { email, language } = await req.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    if (isRateLimited(`email:${normalizedEmail}`, MAX_SUBSCRIBE_REQUESTS_PER_EMAIL)) {
      return NextResponse.json({ error: 'Too many subscribe attempts' }, { status: 429 })
    }

    const lang: 'en' | 'es' | undefined = (language === 'en' || language === 'es') ? language : undefined

    await connectToDatabase()
    const existing = await Subscriber.findOne({ email: normalizedEmail })

    if (existing) {
      if (lang) existing.language = lang

      if (existing.confirmed) {
        // Already opted in — just reactivate (covers resubscribe after unsubscribe).
        existing.unsubscribed = false
        await existing.save()
        return NextResponse.json({ ok: true, pending: false })
      }

      // Pending (or legacy unconfirmed): refresh the confirm token and resend the email.
      existing.unsubscribed = false
      existing.confirmToken = randomUUID()
      if (!existing.token) existing.token = randomUUID()
      await existing.save()
      await sendConfirmation({ email: existing.email, language: existing.language, confirmToken: existing.confirmToken })
      return NextResponse.json({ ok: true, pending: true })
    }

    const confirmToken = randomUUID()
    const created = await Subscriber.create({
      email: normalizedEmail,
      language: lang,
      token: randomUUID(),
      confirmed: false,
      confirmToken,
    })
    await sendConfirmation({ email: created.email, language: created.language, confirmToken })
    return NextResponse.json({ ok: true, pending: true })
  } catch (err) {
    console.error('Subscribe failed', err)
    return NextResponse.json({ error: 'Subscribe failed' }, { status: 500 })
  }
}
