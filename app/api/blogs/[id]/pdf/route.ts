'use server'

import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { connectToDatabase } from '@/lib/mongodb'
import Blog from '@/models/Blog'
import { requireAdmin } from '@/lib/admin-auth'

const MAX_BLOG_PDF_BYTES = 8 * 1024 * 1024
const BLOG_ID_RE = /^[a-fA-F0-9]{24}$/
const safeSlug = (value: string) => value.replace(/[^a-zA-Z0-9-]/g, '-')

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    if (!BLOG_ID_RE.test(id)) {
      return NextResponse.json({ error: 'Invalid blog id' }, { status: 400 })
    }

    const admin = await requireAdmin(req)
    if (!admin.ok) return admin.response

    const form = await req.formData()
    const file = form.get('file') as File | null
    const lang = (form.get('lang') as string || '').toLowerCase()
    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'PDF file required' }, { status: 400 })
    }
    if (file.size > MAX_BLOG_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF is too large. Maximum size is 8 MB.' }, { status: 413 })
    }
    if (!['en', 'es'].includes(lang)) {
      return NextResponse.json({ error: 'Invalid lang' }, { status: 400 })
    }

    await connectToDatabase()
    const blog = await Blog.findById(id)
    if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    if (buffer.subarray(0, 5).toString('utf8') !== '%PDF-') {
      return NextResponse.json({ error: 'Invalid PDF content' }, { status: 400 })
    }

    const dir = path.join(process.cwd(), 'public', 'blogs')
    await fs.mkdir(dir, { recursive: true })
    const base = `${safeSlug(blog.slug)}-${lang}.pdf`
    const relative = path.posix.join('blogs', base)
    const absolute = path.join(process.cwd(), 'public', relative)
    await fs.writeFile(absolute, buffer)
    await fs.chmod(absolute, 0o644)

    if (lang === 'en') blog.pdf_en = `/${relative}`
    else blog.pdf_es = `/${relative}`
    await blog.save()

    return NextResponse.json({ path: `/${relative}` })
  } catch (err) {
    console.error('PDF upload failed', err)
    return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 })
  }
}
