'use server'

import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { connectToDatabase } from '@/lib/mongodb'
import Blog from '@/models/Blog'
import { requireAdmin } from '@/lib/admin-auth'
import { renderBlogPdf, type BlogPdfInput } from '@/lib/blog-pdf'

const BLOG_ID_RE = /^[a-fA-F0-9]{24}$/
const safeSlug = (value: string) => value.replace(/[^a-zA-Z0-9-]/g, '-')

type Lang = 'en' | 'es'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    if (!BLOG_ID_RE.test(id)) {
      return NextResponse.json({ error: 'Invalid blog id' }, { status: 400 })
    }

    const admin = await requireAdmin(req)
    if (!admin.ok) return admin.response

    // lang from query (?lang=en|es|both); body { lang } as a fallback. Default both.
    let lang = (req.nextUrl.searchParams.get('lang') || '').toLowerCase()
    if (!lang) {
      try {
        const body = await req.json()
        lang = String(body?.lang || '').toLowerCase()
      } catch {
        /* no body */
      }
    }
    if (!lang) lang = 'both'
    if (!['en', 'es', 'both'].includes(lang)) {
      return NextResponse.json({ error: 'Invalid lang' }, { status: 400 })
    }
    const langs: Lang[] = lang === 'both' ? ['en', 'es'] : [lang as Lang]

    await connectToDatabase()
    const blog = await Blog.findById(id)
    if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 })

    const dir = path.join(process.cwd(), 'public', 'blogs')
    await fs.mkdir(dir, { recursive: true })

    const generated: Lang[] = []
    for (const l of langs) {
      const buffer = await renderBlogPdf(blog as unknown as BlogPdfInput, l)
      const base = `${safeSlug(blog.slug)}-${l}.pdf`
      const relative = path.posix.join('blogs', base)
      const absolute = path.join(process.cwd(), 'public', relative)
      await fs.writeFile(absolute, buffer)
      await fs.chmod(absolute, 0o644)
      if (l === 'en') blog.pdf_en = `/${relative}`
      else blog.pdf_es = `/${relative}`
      generated.push(l)
    }
    await blog.save()

    return NextResponse.json({ ok: true, generated, pdf_en: blog.pdf_en || null, pdf_es: blog.pdf_es || null })
  } catch (err) {
    console.error('PDF generation failed', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
