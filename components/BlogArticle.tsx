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

    const stylesheets = [
      {
        id: 'katex-stylesheet',
        href: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css'
      },
      {
        id: 'tinymce-content-stylesheet',
        href: 'https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.7.3/skins/content/default/content.min.css'
      },
      {
        id: 'tinymce-content-inline-stylesheet',
        href: 'https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.7.3/skins/content/default/content.inline.min.css'
      }
    ] as const

    stylesheets.forEach(({ id, href }) => {
      if (!document.getElementById(id)) {
        const link = document.createElement('link')
        link.id = id
        link.rel = 'stylesheet'
        link.href = href
        link.crossOrigin = 'anonymous'
        document.head.appendChild(link)
      }
    })
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
    return DOMPurify.sanitize(current.content || '', {
      USE_PROFILES: { html: true },
      ADD_TAGS: ['iframe', 'figure', 'figcaption', 'video', 'source', 'math', 'mi', 'mn', 'mo', 'ms', 'mspace', 'mtext', 'semantics', 'annotation', 'annotation-xml'],
      ADD_ATTR: ['style', 'class', 'id', 'title', 'target', 'rel', 'frameborder', 'allow', 'allowfullscreen', 'controls', 'autoplay', 'muted', 'playsinline', 'loop', 'data-katex-display'],
      ALLOW_DATA_ATTR: true,
    })
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

      <div className="blog-content mce-content-body" dangerouslySetInnerHTML={{ __html: sanitizedHtml.replace(/\n/g, '<br />') }} />
    </div>
  )
}
