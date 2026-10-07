'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight, Search } from 'lucide-react'
import NewsletterInline from './NewsletterInline'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'
import { blogSlug, clean, EASE_OUT, pick, type BlogCard, type Lang } from './content'

interface WritingSectionProps {
    lang?: Lang
    initialContent?: Record<string, any> | null
    initialBlogs?: BlogCard[]
    dictionary?: any
}

export default function WritingSection({ lang = 'en', initialContent = null, initialBlogs = [], dictionary = {} }: WritingSectionProps) {
    const [query, setQuery] = useState('')
    const t = dictionary?.blog?.list || {}
    const date = useMemo(() => new Intl.DateTimeFormat(lang === 'es' ? 'es-AR' : 'en-US', { year: 'numeric', month: 'short' }), [lang])

    const blogs = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return initialBlogs
        return initialBlogs.filter((blog) =>
            [pick(lang, blog, 'title'), pick(lang, blog, 'subtitle'), ...(blog.tags || [])].some((v) => String(v || '').toLowerCase().includes(q)),
        )
    }, [initialBlogs, query, lang])

    const heading = clean(pick(lang, initialContent, 'title')) || t.heading || 'Blog'
    const lead = clean(pick(lang, initialContent, 'description')) || t.descriptionFallback

    return (
        <div>
            <SectionHeading title={heading} lead={lead} circuit="writing" />

            {initialBlogs.length > 6 && (
                <label className="relative mt-10 block max-w-md">
                    <span className="sr-only">{t.searchPlaceholder || 'Search blogs...'}</span>
                    <Search aria-hidden="true" size={16} strokeWidth={1.75} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-fg-dim" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t.searchPlaceholder || 'Search blogs...'}
                        className="h-12 w-full rounded-full border border-line/15 bg-surface pl-12 pr-5 text-[15px] text-fg placeholder:text-fg-dim focus:border-signal/70 focus:outline-none"
                    />
                </label>
            )}

            {initialBlogs.length === 0 ? (
                <Reveal className="mt-14">
                    <p className="text-xl text-fg">{t.comingSoonTitle || 'Coming Soon!'}</p>
                    <p className="mt-2 text-fg-soft">{t.comingSoonCopy}</p>
                </Reveal>
            ) : blogs.length === 0 ? (
                <p className="mt-14 text-fg-soft">{t.noResults || 'No blogs found matching your search.'}</p>
            ) : (
                <ol className="mt-14 border-t border-line/[0.08]">
                    {blogs.map((blog, i) => {
                        const title = clean(pick(lang, blog, 'title'))
                        const subtitle = clean(pick(lang, blog, 'subtitle'))
                        const created = blog.createdAt ? date.format(new Date(blog.createdAt)) : ''
                        return (
                            <motion.li
                                key={blog._id}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.4 }}
                                transition={{ duration: 0.8, delay: Math.min(i, 4) * 0.05, ease: EASE_OUT }}
                                className="border-b border-line/[0.08]"
                            >
                                <Link
                                    href={`/${lang}/blog/${blogSlug(blog)}`}
                                    prefetch={false}
                                    className="group relative grid gap-4 py-9 md:grid-cols-[8rem_minmax(0,1fr)_auto] md:items-baseline md:gap-10 md:py-12"
                                >
                                    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-5 -right-5 rounded-2xl bg-fg/[0.04] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                    <span className="relative font-mono text-[13px] text-fg-dim">{created}</span>
                                    <span className="relative">
                                        <span className="block text-[clamp(1.6rem,3.2vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-fg transition-transform duration-500 ease-out group-hover:translate-x-2">
                                            {title}
                                        </span>
                                        {subtitle && <span className="mt-3 block max-w-[60ch] text-[17px] leading-relaxed text-fg-soft">{subtitle}</span>}
                                    </span>
                                    <span className="relative hidden h-12 w-12 place-items-center rounded-full border border-line/15 text-fg transition-[border-color,background-color,transform] duration-500 group-hover:rotate-45 group-hover:border-action group-hover:bg-action group-hover:text-action-fg md:grid">
                                        <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" />
                                    </span>
                                </Link>
                            </motion.li>
                        )
                    })}
                </ol>
            )}

            <Reveal className="field-navy mt-20 grid gap-8 rounded-3xl p-6 sm:p-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:items-end lg:gap-16">
                <p className="max-w-[30ch] text-2xl font-medium leading-snug tracking-[-0.02em] text-fg">
                    {dictionary?.newsletter?.disclaimer || 'We only email when a new blog is published. Unsubscribe anytime.'}
                </p>
                <NewsletterInline lang={lang} dict={{ ...dictionary?.newsletter, disclaimer: '' }} />
            </Reveal>
        </div>
    )
}
