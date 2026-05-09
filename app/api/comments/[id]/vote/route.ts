'use server'

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Comment from '@/models/Comment'

const RATE_LIMIT_WINDOW_MS = 60 * 1000
const MAX_VOTE_REQUESTS_PER_WINDOW = 30
const voteAttempts = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(key: string) {
  const now = Date.now()
  const current = voteAttempts.get(key)
  if (!current || current.resetAt <= now) {
    voteAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  current.count += 1
  return current.count > MAX_VOTE_REQUESTS_PER_WINDOW
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const { direction } = await req.json() as { direction: 'up' | 'down' | 'clear' }
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim()
    if (isRateLimited(`${ip}:${id}`)) {
      return NextResponse.json({ error: 'Too many vote attempts' }, { status: 429 })
    }

    if (!['up', 'down', 'clear'].includes(direction)) {
      return NextResponse.json({ error: 'Invalid vote' }, { status: 400 })
    }

    await connectToDatabase()
    const comment = await Comment.findById(id)
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const existing = comment.votes.find(v => v.ip === ip)
    if (direction === 'clear') {
      if (existing) {
        comment.votes = comment.votes.filter(v => v.ip !== ip)
      }
    } else {
      const value = direction === 'up' ? 1 : -1
      if (existing) {
        existing.value = value
      } else {
        comment.votes.push({ ip, value } as any)
      }
    }

    await comment.save()
    return NextResponse.json({
      upvotes: comment.votes.filter(v => v.value === 1).length,
      downvotes: comment.votes.filter(v => v.value === -1).length,
    })
  } catch (err) {
    console.error('Failed to vote comment', err)
    return NextResponse.json({ error: 'Failed to vote comment' }, { status: 500 })
  }
}
