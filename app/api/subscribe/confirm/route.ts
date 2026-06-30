'use server'

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Subscriber from '@/models/Subscriber'
import { publicUrl } from '@/lib/public-url'

// Double opt-in confirmation runs ONLY via POST (a button the human clicks),
// never on GET — so passive email link-scanners (Safe Links, URL Defense, …)
// cannot auto-confirm a subscription the recipient never agreed to.
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const lang = searchParams.get('lang') === 'es' ? 'es' : 'en'
  const dest = (status: string) => publicUrl(req, `/${lang}/subscribe/confirm?status=${status}`)

  try {
    if (!token) {
      return NextResponse.redirect(dest('missing-token'), { status: 303 })
    }
    await connectToDatabase()
    const subscriber = await Subscriber.findOne({ confirmToken: token })
    if (!subscriber) {
      return NextResponse.redirect(dest('invalid-token'), { status: 303 })
    }
    if (!subscriber.confirmed) {
      subscriber.confirmed = true
      subscriber.confirmedAt = new Date()
      subscriber.confirmToken = undefined
      subscriber.unsubscribed = false
      await subscriber.save()
    }
    return NextResponse.redirect(dest('success'), { status: 303 })
  } catch (error) {
    console.error('Subscription confirmation failed', error)
    return NextResponse.redirect(dest('error'), { status: 303 })
  }
}
