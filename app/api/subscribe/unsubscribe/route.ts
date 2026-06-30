'use server'

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Subscriber from '@/models/Subscriber'
import { localeFromCookie } from '@/lib/public-url'

const FALLBACK_BASE_URL = 'https://inakilozano.com'
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

const sanitizeBaseUrl = (input: string | undefined | null): string | null => {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    if (LOCAL_HOSTNAMES.has(url.hostname)) {
      return null
    }
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch (_error) {
    return null
  }
}

const resolvePublicBaseUrl = (req: Request): string => {
  const candidates = [
    sanitizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL),
    sanitizeBaseUrl(process.env.NEXTAUTH_URL)
  ] as const

  for (const candidate of candidates) {
    if (candidate) return candidate
  }

  try {
    const requestOrigin = new URL(req.url).origin
    const requestHost = new URL(requestOrigin).hostname
    if (!LOCAL_HOSTNAMES.has(requestHost)) {
      return requestOrigin
    }
  } catch (_error) {
    // ignore and fall back
  }

  return FALLBACK_BASE_URL
}

const buildRedirectUrl = (req: Request, path: string) => {
  const base = resolvePublicBaseUrl(req)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}

export async function GET(req: Request) {
  // Locale-prefixed target so the Next middleware doesn't strip the ?status query.
  const lang = localeFromCookie(req)
  const statusUrl = (status: string) => buildRedirectUrl(req, `/${lang}/subscribe/unsubscribe?status=${status}`)
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) {
      return NextResponse.redirect(statusUrl('missing-token'), { status: 302 })
    }
    await connectToDatabase()
    const sub = await Subscriber.findOne({ token })
    if (!sub) {
      return NextResponse.redirect(statusUrl('invalid-token'), { status: 302 })
    }
    sub.unsubscribed = true
    await sub.save()
    return NextResponse.redirect(statusUrl('success'), { status: 302 })
  } catch (err) {
    console.error('Unsubscribe failed', err)
    return NextResponse.redirect(statusUrl('error'), { status: 302 })
  }
}

// RFC 8058 one-click unsubscribe: mailbox providers POST here directly (no
// redirect / no human page). Respond 200 on success.
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'missing-token' }, { status: 400 })
    }
    await connectToDatabase()
    const sub = await Subscriber.findOne({ token })
    if (!sub) {
      // Already gone / invalid — treat as success so the provider stops retrying.
      return NextResponse.json({ ok: true }, { status: 200 })
    }
    if (!sub.unsubscribed) {
      sub.unsubscribed = true
      await sub.save()
    }
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('One-click unsubscribe failed', err)
    return NextResponse.json({ error: 'error' }, { status: 500 })
  }
}

