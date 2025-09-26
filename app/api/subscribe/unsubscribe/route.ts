'use server'

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Subscriber from '@/models/Subscriber'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }
    await connectToDatabase()
    const sub = await Subscriber.findOne({ token })
    if (!sub) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }
    sub.unsubscribed = true
    await sub.save()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Unsubscribe failed', err)
    return NextResponse.json({ error: 'Unsubscribe failed' }, { status: 500 })
  }
}

