'use server'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import path from 'path'
import fs from 'fs/promises'
import { connectToDatabase } from '@/lib/mongodb'
import Blog from '@/models/Blog'

interface Params { params: { id: string } }

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    const lang = (form.get('lang') as string || '').toLowerCase()
    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'PDF file required' }, { status: 400 })
    }
    if (!['en', 'es'].includes(lang)) {
      return NextResponse.json({ error: 'Invalid lang' }, { status: 400 })
    }

    await connectToDatabase()
    const blog = await Blog.findById(params.id)
    if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const dir = path.join(process.cwd(), 'public', 'blogs')
    await fs.mkdir(dir, { recursive: true })
    const base = `${blog.slug}-${lang}.pdf`
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

