import { NextRequest, NextResponse } from 'next/server'
import type { FilterQuery } from 'mongoose'
import { connectToDatabase } from '@/lib/mongodb'
import Comment, { IComment } from '@/models/Comment'
import { requireAdmin } from '@/lib/admin-auth'

const HEX_24 = /^[a-fA-F0-9]{24}$/

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const blog = searchParams.get('blog')

    const filter: FilterQuery<IComment> = {}
    if (status && ['approved', 'rejected', 'pending'].includes(status)) {
      filter.status = status
    }
    if (blog && HEX_24.test(blog)) {
      filter.blog = blog
    }

    await connectToDatabase()
    const comments = await Comment.find(filter)
      .sort({ createdAt: -1 })
      .populate('blog', 'title title_en slug')
      .lean()

    return NextResponse.json(comments)
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

    if (!blogId || !HEX_24.test(blogId)) {
      return NextResponse.json({ error: 'Invalid blog id' }, { status: 400 })
    }
    if (!parentId || !HEX_24.test(parentId)) {
      return NextResponse.json({ error: 'Invalid parent id' }, { status: 400 })
    }

    const sanitizedContent = String(content ?? '').slice(0, 5000).replace(/[<>]/g, '')
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
