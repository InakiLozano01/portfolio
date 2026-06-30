import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Comment from '@/models/Comment'
import { requireAdmin } from '@/lib/admin-auth'

const HEX_24 = /^[a-fA-F0-9]{24}$/
const ALLOWED_STATUS = ['approved', 'rejected', 'pending'] as const

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  if (!id || !HEX_24.test(id)) {
    return NextResponse.json({ error: 'Invalid comment id' }, { status: 400 })
  }

  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  try {
    const { status } = await request.json()
    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    await connectToDatabase()
    const comment = await Comment.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    )

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Failed to update comment', error)
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  if (!id || !HEX_24.test(id)) {
    return NextResponse.json({ error: 'Invalid comment id' }, { status: 400 })
  }

  const admin = await requireAdmin(request)
  if (!admin.ok) return admin.response

  try {
    await connectToDatabase()

    // Collect the comment and all descendant replies to avoid orphaned threads.
    const ids = new Set<string>([id])
    let frontier = [id]
    while (frontier.length > 0) {
      const children = await Comment.find({ parent: { $in: frontier } })
        .select('_id')
        .lean()
      frontier = []
      for (const child of children) {
        const childId = String(child._id)
        if (!ids.has(childId)) {
          ids.add(childId)
          frontier.push(childId)
        }
      }
    }

    const result = await Comment.deleteMany({ _id: { $in: Array.from(ids) } })
    return NextResponse.json({ ok: true, deleted: result.deletedCount ?? 0 })
  } catch (error) {
    console.error('Failed to delete comment', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
