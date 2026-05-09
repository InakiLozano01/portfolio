'use server'

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Subscriber from '@/models/Subscriber'
import { randomUUID } from 'crypto'

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const MAX_SUBSCRIBE_REQUESTS_PER_IP = 20
const MAX_SUBSCRIBE_REQUESTS_PER_EMAIL = 5
const subscribeAttempts = new Map<string, { count: number; resetAt: number }>()

function getClientIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim()
}

function isRateLimited(key: string, maxRequests: number) {
  const now = Date.now()
  const current = subscribeAttempts.get(key)
  if (!current || current.resetAt <= now) {
    subscribeAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  current.count += 1
  return current.count > maxRequests
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

    await connectToDatabase()
    const existing = await Subscriber.findOne({ email: normalizedEmail })
    if (existing) {
      existing.unsubscribed = false
      if (language === 'en' || language === 'es') existing.language = language
      await existing.save()
      return NextResponse.json({ ok: true })
    }
    const token = randomUUID()
    await Subscriber.create({ email: normalizedEmail, language: (language === 'en' || language === 'es') ? language : undefined, token })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Subscribe failed', err)
    return NextResponse.json({ error: 'Subscribe failed' }, { status: 500 })
  }
}
