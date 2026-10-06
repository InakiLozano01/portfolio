import { slugify } from '@/lib/utils'

export type Lang = 'en' | 'es'

/** Picks the localized CMS value, falling back to the other language, then the base field. */
export function pick(lang: Lang, record: Record<string, any> | null | undefined, field: string): any {
    if (!record) return undefined
    const own = record[`${field}_${lang}`]
    const other = record[`${field}_${lang === 'en' ? 'es' : 'en'}`]
    const base = record[field]
    if (lang === 'en') return own ?? base ?? other
    return own ?? other ?? base
}

/** CMS text sometimes carries stray zero-width joiners and leading spaces; trim them for display. */
export function clean(text: unknown): string {
    if (typeof text !== 'string') return ''
    return text.replace(/^[‍​\s]+/, '').replace(/[‍​]+\s?/g, '').trim()
}

export function projectSlug(project: Record<string, any>): string {
    const raw = typeof project.slug === 'string' ? project.slug.trim() : ''
    if (raw && raw !== 'undefined') return raw
    const source = project.title || project.title_en || project.title_es || project.subtitle || ''
    return source ? slugify(source) : ''
}

export function blogSlug(blog: Record<string, any>): string {
    const raw = typeof blog.slug === 'string' ? blog.slug.trim() : ''
    return raw || slugify(blog.title || blog.title_en || blog.title_es || '')
}

export function publicUrl(url?: string | null): string | null {
    const trimmed = url?.trim()
    if (!trimmed) return null
    if (['undefined', 'null', 'none', '#'].includes(trimmed.toLowerCase())) return null
    return trimmed
}

export interface Technology {
    _id: string
    name: string
    category?: string
    icon?: string
}

export interface ProjectCard {
    _id: string
    slug?: string
    title?: string
    title_en?: string
    title_es?: string
    subtitle?: string
    subtitle_en?: string
    subtitle_es?: string
    thumbnail?: string
    thumbnailSmall?: string
    thumbnailBlur?: string
    publicUrl?: string
    technologies?: Technology[]
}

export interface BlogCard {
    _id: string
    slug?: string
    title?: string
    title_en?: string
    title_es?: string
    subtitle?: string
    subtitle_en?: string
    subtitle_es?: string
    tags?: string[]
    createdAt?: string
}

export interface SkillSummary {
    _id: string
    name: string
    category: string
    icon: string
}

export const EASE_OUT = [0.16, 1, 0.3, 1] as const
