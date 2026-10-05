import { NextRequest, NextResponse } from 'next/server'
import type { FilterQuery } from 'mongoose'
import { connectToDatabase } from '@/lib/mongodb'
import Comment, { IComment } from '@/models/Comment'
import { requireAdmin } from '@/lib/admin-auth'
import { isValidObjectId, sanitizeCommentText, ALLOWED_COMMENT_STATUS } from '@/lib/comments'

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const blog = searchParams.get('blog')

    const filter: FilterQuery<IComment> = {}
    if (status && (ALLOWED_COMMENT_STATUS as readonly string[]).includes(status)) {
      filter.status = status
    }
    if (blog && isValidObjectId(blog)) {
      filter.blog = blog
    }

    await connectToDatabase()
    if (searchParams.get('summary') === '1') {
      return NextResponse.json({ pending: await Comment.countDocuments({ status: 'pending' }) }, { headers: { 'Cache-Control': 'private, no-store' } })
    }
    const comments = await Comment.find(filter)
      .sort({ createdAt: -1 })
      .populate('blog', 'title title_en slug')
      .lean()

    return NextResponse.json(comments, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Failed to fetch comments', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  try {
    const { blogId, parentId, content } = await request.json()

    if (!isValidObjectId(blogId)) {
      return NextResponse.json({ error: 'Invalid blog id' }, { status: 400 })
    }
    if (!isValidObjectId(parentId)) {
      return NextResponse.json({ error: 'Invalid parent id' }, { status: 400 })
    }

    const sanitizedContent = sanitizeCommentText(content)
    if (!sanitizedContent.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    await connectToDatabase()

    const parent = await Comment.findById(parentId).select('blog').lean()
    if (!parent || String(parent.blog) !== String(blogId)) {
      return NextResponse.json({ error: 'Parent comment not found for this blog' }, { status: 400 })
    }

    const comment = await Comment.create({
      blog: blogId,
      parent: parentId,
      content: sanitizedContent,
      alias: 'Iñaki Fernando Lozano',
      ip: 'admin',
      status: 'approved',
      isOfficial: true,
    })

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Failed to create reply', error)
    return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 })
  }
}
