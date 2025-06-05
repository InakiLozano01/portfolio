'use server'

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Comment from '@/models/Comment'

interface Params {
  params: { id: string }
}

async function moderate(content: string): Promise<boolean> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) return true

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:moderateText?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: content }] }] })
      })
    const data = await res.json()
    if (data?.blocked === true) return false
  } catch (err) {
    console.error('Moderation error', err)
  }
  return true
}

export async function GET(_req: Request, { params }: Params) {
  try {
    await connectToDatabase()
    const comments = await Comment.find({ blog: params.id, status: 'approved' }).sort({ createdAt: -1 }).lean()
    return NextResponse.json(comments)
  } catch (err) {
    console.error('Failed to fetch comments', err)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { alias, content } = await req.json()
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim()
    if (!alias || !content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    await connectToDatabase()

    const flood = await Comment.findOne({ blog: params.id, ip }).sort({ createdAt: -1 }).lean()
    if (flood && Date.now() - new Date(flood.createdAt).getTime() < 60000) {
      return NextResponse.json({ error: 'Too many comments' }, { status: 429 })
    }

    const allowed = await moderate(content)
    if (!allowed) {
      return NextResponse.json({ error: 'Comment rejected by moderation' }, { status: 400 })
    }

    const comment = await Comment.create({ blog: params.id, alias, content, ip })
    return NextResponse.json(comment)
  } catch (err) {
    console.error('Failed to create comment', err)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
