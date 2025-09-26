'use server'

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Subscriber from '@/models/Subscriber'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
  try {
    const { email, language } = await req.json()
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    await connectToDatabase()
    const existing = await Subscriber.findOne({ email })
    if (existing) {
      existing.unsubscribed = false
      if (language === 'en' || language === 'es') existing.language = language
      await existing.save()
      return NextResponse.json({ ok: true })
    }
    const token = randomUUID()
    await Subscriber.create({ email, language: (language === 'en' || language === 'es') ? language : undefined, token })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Subscribe failed', err)
    return NextResponse.json({ error: 'Subscribe failed' }, { status: 500 })
  }
}

