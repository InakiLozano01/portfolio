
'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import DOMPurify from 'isomorphic-dompurify'

const TinyMCERenderer = dynamic(() => import('./TinyMCERenderer'), { ssr: false })

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

type LanguageCode = 'en' | 'es'

interface BlogArticleProps {
  blog: BlogLike
  initialLang?: LanguageCode
}

const LANGUAGES: Array<{ code: LanguageCode; label: string; icon: string }> = [
  { code: 'en', label: 'English', icon: '/uk.png' },
  { code: 'es', label: 'Español', icon: '/spain.png' }
]

export default function BlogArticle({ blog, initialLang }: BlogArticleProps) {
  const hasEn = !!(blog.content_en || blog.content)
  const hasEs = !!(blog.content_es || blog.content)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const fallbackLang: LanguageCode = useMemo(() => {
    if (initialLang === 'en' && hasEn) return 'en'
    if (initialLang === 'es' && hasEs) return 'es'
    if (hasEn) return 'en'
    if (hasEs) return 'es'
    return 'en'
  }, [initialLang, hasEn, hasEs])

  const [lang, setLang] = useState<LanguageCode>(fallbackLang)

  useEffect(() => {
    setLang(fallbackLang)
  }, [fallbackLang])

  const updateUrlLang = (next: LanguageCode) => {
    const params = new URLSearchParams(searchParams?.toString())
    if (next === fallbackLang) {
      params.delete('lang')
    } else {
      params.set('lang', next)
    }
    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }

  const handleLangChange = (next: LanguageCode) => {
    if (lang === next) return
    const isAvailable = next === 'en' ? hasEn : hasEs
    if (!isAvailable) return
    setLang(next)
    updateUrlLang(next)
  }

  useEffect(() => {
    if (typeof document === 'undefined') return

    const stylesheets = [
      {
        id: 'katex-stylesheet',
        href: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css'
      },
      {
        id: 'tinymce-content-stylesheet',
        href: '/tinymce/skins/content/default/content.min.css'
      },
      {
        id: 'tinymce-content-inline-stylesheet',
        href: '/tinymce/skins/ui/oxide/content.min.css'
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
          {LANGUAGES.map(({ code, label, icon }) => {
            const disabled = code === 'en' ? !hasEn : !hasEs
            return (
              <button
                key={code}
                type="button"
                onClick={() => handleLangChange(code)}
                className={`px-3 py-1 text-sm transition flex items-center gap-2 ${lang === code
                  ? 'bg-primary text-white'
                  : disabled
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-transparent text-primary hover:bg-primary/10'
                  }`}
                disabled={disabled}
              >
                <Image
                  src={icon}
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 object-contain"
                  aria-hidden
                />
                <span>{code.toUpperCase()}</span>
                <span className="sr-only">{label}</span>
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

      <TinyMCERenderer html={sanitizedHtml} />
    </div>
  )
}
