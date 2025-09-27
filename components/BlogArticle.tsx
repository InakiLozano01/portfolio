'use client'

import { useEffect, useMemo, useState } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import { Editor as TinyMCEEditor } from '@tinymce/tinymce-react'
import { useRef } from 'react'
import { slugify } from '@/lib/utils'

type BlogLike = {
  title: string
  subtitle: string
  content: string
  footer?: string
  bibliography?: string
  title_en?: string
  title_es?: string
  subtitle_en?: string
  subtitle_es?: string
  content_en?: string
  content_es?: string
  footer_en?: string
  footer_es?: string
  bibliography_en?: string
  bibliography_es?: string
  pdf_en?: string
  pdf_es?: string
  createdAt: string
  updatedAt?: string
}

export default function BlogArticle({ blog }: { blog: BlogLike }) {
  const hasEn = !!(blog.content_en || blog.content)
  const hasEs = !!(blog.content_es || blog.content)

  const [lang, setLang] = useState<'en' | 'es'>(hasEn ? 'en' : 'es')

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!document.getElementById('katex-stylesheet')) {
      const link = document.createElement('link')
      link.id = 'katex-stylesheet'
      link.rel = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css'
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    }
  }, [])

  const current = useMemo(() => {
    const pick = (en?: string, es?: string, legacy?: string) => {
      if (lang === 'en' && en) return en
      if (lang === 'es' && es) return es
      return legacy || en || es || ''
    }
    return {
      title: pick(blog.title_en, blog.title_es, blog.title),
      subtitle: pick(blog.subtitle_en, blog.subtitle_es, blog.subtitle),
      content: pick(blog.content_en, blog.content_es, blog.content),
      footer: pick(blog.footer_en, blog.footer_es, blog.footer),
      bibliography: pick(blog.bibliography_en, blog.bibliography_es, blog.bibliography),
      pdf: lang === 'en' ? blog.pdf_en : blog.pdf_es,
    }
  }, [lang, blog])

  const sanitizedHtml = useMemo(() => {
    const sanitized = DOMPurify.sanitize(current.content || '', {
      ADD_ATTR: ['style', 'data-start', 'data-end', 'data-col-size', 'data-turn-id', 'data-testid', 'data-turn', 'data-scroll-anchor', 'data-message-author-role', 'data-message-id', 'data-message-model-slug', 'data-katex-display'],
      ADD_TAGS: ['iframe', 'math', 'mi', 'mn', 'mo', 'ms', 'mspace', 'mtext', 'semantics', 'annotation', 'annotation-xml']
    })

    return sanitized
  }, [current.content])

  const reading = useMemo(() => {
    const words = current.content.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length
    const minutes = Math.max(1, Math.round(words / 200))
    return minutes
  }, [current.content])

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-red-500 bg-clip-text text-transparent">{current.title}</h1>
          <p className="text-xl text-muted-foreground">{current.subtitle}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {reading} min read
          </p>
        </div>
        <div className="inline-flex border rounded overflow-hidden">
          {(['en', 'es'] as const).map(l => {
            const disabled = l === 'en' ? !hasEn : !hasEs
            return (
              <button
                key={l}
                onClick={() => !disabled && setLang(l)}
                className={`px-3 py-1 text-sm transition ${lang === l
                  ? 'bg-primary text-white'
                  : disabled
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-transparent text-primary hover:bg-primary/10'
                  }`}
                disabled={disabled}
              >
                {l.toUpperCase()}
              </button>
            )
          })}
        </div>
      </div>

      {(blog.pdf_en || blog.pdf_es) && (
        <div className="mb-4 text-sm">
          {blog.pdf_en && <a className="text-primary underline mr-4" href={blog.pdf_en} target="_blank" rel="noreferrer">Download PDF (EN)</a>}
          {blog.pdf_es && <a className="text-primary underline" href={blog.pdf_es} target="_blank" rel="noreferrer">Download PDF (ES)</a>}
        </div>
      )}

      <div className="blog-content prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
    </div>
  )
}
