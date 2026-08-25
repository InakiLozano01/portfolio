'use server'

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Comment from '@/models/Comment'
import { isValidObjectId, moderateComment, sanitizeAlias, sanitizeCommentText } from '@/lib/comments'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!isValidObjectId(id)) {
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
  if (!isValidObjectId(id)) {
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

    const allowed = await moderateComment(String(content))
    if (!allowed) {
      return NextResponse.json({ error: 'Comment rejected by moderation' }, { status: 400 })
    }

    const comment = await Comment.create({
      blog: id,
      alias: sanitizeAlias(alias),
      content: sanitizeCommentText(content),
      ip,
      parent: parentId ? parentId : null,
    })
    return NextResponse.json(comment)
  } catch (err) {
    console.error('Failed to create comment', err)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
