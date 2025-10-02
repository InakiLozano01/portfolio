'use server'

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Subscriber from '@/models/Subscriber'

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
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) {
      return NextResponse.redirect(buildRedirectUrl(req, '/unsubscribe?status=missing-token'), { status: 302 })
    }
    await connectToDatabase()
    const sub = await Subscriber.findOne({ token })
    if (!sub) {
      return NextResponse.redirect(buildRedirectUrl(req, '/unsubscribe?status=invalid-token'), { status: 302 })
    }
    sub.unsubscribed = true
    await sub.save()
    return NextResponse.redirect(buildRedirectUrl(req, '/unsubscribe?status=success'), { status: 302 })
  } catch (err) {
    console.error('Unsubscribe failed', err)
    return NextResponse.redirect(buildRedirectUrl(req, '/unsubscribe?status=error'), { status: 302 })
  }
}

