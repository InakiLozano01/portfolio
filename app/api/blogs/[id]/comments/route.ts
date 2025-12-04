'use server'

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Comment from '@/models/Comment'

async function moderate(content: string): Promise<boolean> {
  // Basic local moderation fallback
  const banned = [
    /\b(?:kill|suicide|rape|nazi|terror|slur|retard|faggot)\b/i,
    /(https?:\/\/\S{40,})/i,
    /(.)\1{10,}/,
  ]
  for (const rx of banned) {
    if (rx.test(content)) return false
  }

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

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id || !id.trim() || !id.match(/^[a-fA-F0-9]{24}$/)) {
    return NextResponse.json({ error: 'Invalid blog id' }, { status: 400 })
  }
  try {
    await connectToDatabase()
    const comments = await Comment.find({ blog: id, status: 'approved' }).sort({ createdAt: -1 }).lean()
    return NextResponse.json(comments)
  } catch (err) {
    console.error('Failed to fetch comments', err)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id || !id.trim() || !id.match(/^[a-fA-F0-9]{24}$/)) {
    return NextResponse.json({ error: 'Invalid blog id' }, { status: 400 })
  }
  try {
    const { alias, content, parentId } = await req.json()
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim()
    if (!alias || !content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    await connectToDatabase()

    const flood = await Comment.findOne({ blog: id, ip }).sort({ createdAt: -1 }).lean()
    if (flood && Date.now() - new Date(flood.createdAt).getTime() < 60000) {
      return NextResponse.json({ error: 'Too many comments' }, { status: 429 })
    }

    const allowed = await moderate(content)
    if (!allowed) {
      return NextResponse.json({ error: 'Comment rejected by moderation' }, { status: 400 })
    }

    const sanitizedAlias = String(alias).slice(0, 40).replace(/[<>]/g, '')
    const sanitizedContent = String(content).slice(0, 5000).replace(/[<>]/g, '')
    const parent = parentId ? parentId : null

    const comment = await Comment.create({ blog: id, alias: sanitizedAlias, content: sanitizedContent, ip, parent })
    return NextResponse.json(comment)
  } catch (err) {
    console.error('Failed to create comment', err)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
