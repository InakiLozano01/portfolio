'use client'

import { useMemo, useState } from 'react'
import DOMPurify from 'isomorphic-dompurify'
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

  const [lang, setLang] = useState<'en'|'es'>(hasEn ? 'en' : 'es')

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

  const { sanitizedHtml, toc } = useMemo(() => {
    const sanitized = DOMPurify.sanitize(current.content)
    const headingRegex = /<(h2|h3)>([^<]+)<\/\1>/g
    const matches = Array.from(sanitized.matchAll(headingRegex))
    const toc = matches.map((m) => ({
      level: m[1] as 'h2' | 'h3',
      text: m[2],
      id: slugify(m[2])
    }))
    const htmlWithIds = sanitized
      .replace(/<h2>([^<]+)<\/h2>/g, (_m, t) => `<h2 id=\"${slugify(t)}\">${t}</h2>`)
      .replace(/<h3>([^<]+)<\/h3>/g, (_m, t) => `<h3 id=\"${slugify(t)}\">${t}</h3>`)
    return { sanitizedHtml: htmlWithIds, toc }
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
          {(['en','es'] as const).map(l => {
            const disabled = l === 'en' ? !hasEn : !hasEs
            return (
              <button
                key={l}
                onClick={() => !disabled && setLang(l)}
                className={`px-3 py-1 text-sm transition ${
                  lang === l
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

      {toc.length > 0 && (
        <nav aria-label="Table of contents" className="mb-6 border-l-2 border-primary/20 pl-4">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Contents</p>
          <ul className="mt-2 space-y-1">
            {toc.map((item, i) => (
              <li key={`${item.id}-${i}`} className={item.level === 'h3' ? 'ml-4' : ''}>
                <a href={`#${item.id}`} className="text-primary hover:underline">
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
    </div>
  )
}
