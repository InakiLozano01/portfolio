'use server'

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Comment from '@/models/Comment'

interface Params { params: { id: string } }

export async function POST(req: Request, { params }: Params) {
  try {
    const { direction } = await req.json() as { direction: 'up' | 'down' | 'clear' }
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim()
    if (!['up', 'down', 'clear'].includes(direction)) {
      return NextResponse.json({ error: 'Invalid vote' }, { status: 400 })
    }

    await connectToDatabase()
    const comment = await Comment.findById(params.id)
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

