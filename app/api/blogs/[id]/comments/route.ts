'use server'

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Comment from '@/models/Comment'
import Blog from '@/models/Blog'
import { getClientIp } from '@/lib/client-ip'
import { hit } from '@/lib/rate-limit'
import { isValidObjectId, moderateComment, sanitizeAlias, sanitizeCommentText } from '@/lib/comments'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid blog id' }, { status: 400 })
  }
  try {
    await connectToDatabase()
    const comments = await Comment.find({ blog: id, status: 'approved' }).sort({ createdAt: -1 }).lean()
    return NextResponse.json(comments.map(publicComment), { headers: { 'Cache-Control': 'no-store' } })
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
    const ip = getClientIp(req)
    if (!hit(`comment:${ip}`, 6, 10 * 60 * 1000).ok) {
      return NextResponse.json({ error: 'Too many comments' }, { status: 429 })
    }
    const cleanAlias = sanitizeAlias(alias).trim()
    const cleanContent = sanitizeCommentText(content).trim()
    if (typeof alias !== 'string' || typeof content !== 'string' || cleanAlias.length < 2 || cleanContent.length < 3 || content.length > 5000 || alias.length > 40) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    await connectToDatabase()
    const blog = await Blog.findOne({ _id: id, published: true }).select('title title_en title_es').lean()
    if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 })
    if (parentId) {
      if (!isValidObjectId(parentId)) return NextResponse.json({ error: 'Invalid parent id' }, { status: 400 })
      const parent = await Comment.findOne({ _id: parentId, blog: id, status: 'approved' }).select('_id').lean()
      if (!parent) return NextResponse.json({ error: 'Parent comment not found' }, { status: 400 })
    }

    const flood = await Comment.findOne({ blog: id, ip }).sort({ createdAt: -1 }).lean()
    if (flood && Date.now() - new Date(flood.createdAt).getTime() < 60000) {
      return NextResponse.json({ error: 'Too many comments' }, { status: 429 })
    }

    const moderation = await moderateComment(cleanContent, blog.title_en || blog.title || blog.title_es || '', cleanAlias)

    const comment = await Comment.create({
      blog: id,
      alias: cleanAlias,
      content: cleanContent,
      status: moderation.status,
      moderation,
      ip,
      parent: parentId ? parentId : null,
    })
    return NextResponse.json({ ...publicComment(comment), status: moderation.status }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('Failed to create comment', err)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}

function publicComment(comment: { _id: unknown; alias: string; content: string; parent?: unknown; createdAt: Date; isOfficial: boolean; votes?: { value: number }[] }) {
  return { _id: comment._id, alias: comment.alias, content: comment.content, parent: comment.parent, createdAt: comment.createdAt, isOfficial: comment.isOfficial, votes: comment.votes?.map(v => ({ value: v.value })) || [] }
}
