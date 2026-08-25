'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowUpRight, Search } from 'lucide-react'
// Removed unused imports
import { type Blog } from '@/models/BlogClient'
import { formatDistanceToNow } from 'date-fns'
import { es as esLocale } from 'date-fns/locale'
import { formatDate } from '@/lib/utils'
import NewsletterSignup from '@/components/NewsletterSignup'

export default function BlogSection({ lang = 'en', initialContent, initialBlogs, dictionary = {} }: { lang?: 'en' | 'es'; initialContent?: Record<string, any>; initialBlogs?: Blog[]; dictionary?: any }) {
    const blogListDict = dictionary?.blog?.list || {}
    const t = {
        heading: blogListDict.heading || 'Blog',
        descriptionFallback: blogListDict.descriptionFallback || 'Stories, updates, and research notes.',
        searchPlaceholder: blogListDict.searchPlaceholder || 'Search blogs...',
        error: blogListDict.error || 'Error',
        comingSoonTitle: blogListDict.comingSoonTitle || 'Coming Soon!',
        comingSoonCopy: blogListDict.comingSoonCopy || "We're preparing some exciting content for you. Stay tuned!",
        noResults: blogListDict.noResults || 'No blogs found matching your search.',
        created: blogListDict.created || 'Created',
        languages: blogListDict.languages || 'EN / ES',
        filterByTagAria: blogListDict.filterByTagAria || 'Filter by tag',
        moreTags: blogListDict.moreTags || 'more',
        readArticle: blogListDict.readArticle || 'Read article',
        fetchError: blogListDict.fetchError || 'Failed to fetch blogs',
    }
    const [blogs, setBlogs] = useState<Blog[]>(initialBlogs || []);
    const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>(initialBlogs || []);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(!initialBlogs);
    const [error, setError] = useState<string | null>(null);
    const [sectionTitleBase, setSectionTitleBase] = useState(initialContent?.title || '');
    const [sectionTitleEn, setSectionTitleEn] = useState(initialContent?.title_en || initialContent?.title || '');
    const [sectionTitleEs, setSectionTitleEs] = useState(initialContent?.title_es || initialContent?.title || '');
    const [sectionDescription, setSectionDescription] = useState(initialContent?.description || '');
    const [sectionDescriptionEn, setSectionDescriptionEn] = useState(initialContent?.description_en || '');
    const [sectionDescriptionEs, setSectionDescriptionEs] = useState(initialContent?.description_es || '');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (initialBlogs) return

        async function fetchBlogs() {
            try {
                const requests = [fetch('/api/blogs')]
                if (!initialContent) requests.push(fetch('/api/sections/blog'))
                const [response, sectionResponse] = await Promise.all(requests)

                if (sectionResponse?.ok) {
                    const sectionData = await sectionResponse.json();
                    if (sectionData && sectionData.content) {
                        setSectionTitleBase(sectionData.title || sectionData.content.title || '');
                        setSectionTitleEn(sectionData.content.title_en || sectionData.content.title || sectionData.title || '');
                        setSectionTitleEs(sectionData.content.title_es || sectionData.content.title || sectionData.title || '');
                        setSectionDescription(sectionData.content.description || '');
                        setSectionDescriptionEn(sectionData.content.description_en || '');
                        setSectionDescriptionEs(sectionData.content.description_es || '');
                    }
                }

                if (!response.ok) {
                    throw new Error(t.fetchError || 'Failed to fetch blogs');
                }
                const data = await response.json();
                const publishedBlogs = data
                    .filter((blog: Blog) => blog.published)
                    .map((blog: Blog) => ({
                        ...blog,
                        title_en: blog.title_en || blog.title_es || blog.title,
                        title_es: blog.title_es || blog.title_en || blog.title,
                        subtitle_en: blog.subtitle_en || blog.subtitle_es || blog.subtitle,
                        subtitle_es: blog.subtitle_es || blog.subtitle_en || blog.subtitle,
                        content_en: blog.content_en || blog.content_es || blog.content,
                        content_es: blog.content_es || blog.content_en || blog.content,
                    }));
                setBlogs(publishedBlogs);
                setFilteredBlogs(publishedBlogs);
            } catch (err) {
                setError(err instanceof Error ? err.message : (dictionary?.common?.errorOccurred || 'An error occurred'));
            } finally {
                setLoading(false);
            }
        }

        fetchBlogs();
    }, [initialContent, initialBlogs, t.fetchError]);

    useEffect(() => {
        const query = searchQuery.trim().toLowerCase();
        const filtered = blogs.filter((blog) => {
            if (!query) return true;
            const haystack = [
                blog.title_en,
                blog.title_es,
                blog.subtitle_en,
                blog.subtitle_es,
                blog.content_en,
                blog.content_es,
                ...blog.tags,
            ]
                .filter(Boolean)
                .map((value) => value.toLowerCase());

            return haystack.some((value) => value.includes(query));
        });
        setFilteredBlogs(filtered);
    }, [searchQuery, blogs]);

    useEffect(() => {
        setMounted(true)
    }, [])

    const highlight = (text?: string) => {
        const fallback = text ?? ''
        const q = searchQuery.trim()
        if (!q) return fallback
        const regex = new RegExp(`(${q.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'ig')
        return fallback.split(regex).map((part, i) =>
            regex.test(part) ? (
                <mark key={i} className="bg-yellow-200 text-black rounded px-0.5">{part}</mark>
            ) : (
                <span key={i}>{part}</span>
            )
        )
    }

    const maxVisibleTags = 4

    const getTagDisplay = useMemo(() => {
        return (tags: string[]) => {
            if (tags.length <= maxVisibleTags) return { visible: tags, hidden: [] }
            return {
                visible: tags.slice(0, maxVisibleTags),
                hidden: tags.slice(maxVisibleTags),
            }
        }
    }, [])

    const heading = lang === 'es'
        ? (sectionTitleEs || t.heading)
        : (sectionTitleEn || sectionTitleBase || t.heading)
    const sectionCopy =
        lang === 'es'
            ? (sectionDescriptionEs || t.descriptionFallback)
            : (sectionDescriptionEn || sectionDescription || t.descriptionFallback)
    const dateLocale = lang === 'es' ? esLocale : undefined

    if (loading) {
        return (
            <div className="container mx-auto py-8 px-4">
                <div className="mb-8">
                    <Input
                        type="text"
                        placeholder={t.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-md mx-auto bg-white text-black placeholder:text-gray-500"
                        disabled
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader>
                                <div className="h-8 bg-primary/10 rounded mb-4" />
                                <div className="h-4 bg-primary/10 rounded w-3/4" />
                            </CardHeader>
                            <CardContent>
                                <div className="h-4 bg-primary/10 rounded mb-2" />
                                <div className="h-4 bg-primary/10 rounded w-2/3" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto py-8 px-4 text-center text-red-500">
                {t.error}: {error}
            </div>
        );
    }

    if (blogs.length === 0) {
        return (
            <div className="container mx-auto py-8 px-4 text-center">
                <h2 className="text-3xl font-bold mb-4">{t.comingSoonTitle}</h2>
                <p className="text-muted-foreground">{t.comingSoonCopy}</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-4 md:py-8">
            <header className="relative overflow-hidden rounded-xl bg-[#263547] px-6 py-8 text-white shadow-lg md:px-10 md:py-10">
                <div className="relative max-w-3xl">
                    <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{heading}</h2>
                    {sectionCopy && <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-200 md:text-lg">{sectionCopy}</p>}
                </div>
                <span className="absolute bottom-0 left-6 h-1 w-20 bg-[#FD4345] md:left-10" aria-hidden="true" />
            </header>
            <div className="my-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)] md:items-start">
                <label className="relative block">
                    <span className="sr-only">{t.searchPlaceholder}</span>
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                    <Input
                        type="search"
                        placeholder={t.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-12 border-slate-300 bg-white pl-11 text-black placeholder:text-slate-500 focus-visible:ring-[#FD4345]"
                    />
                </label>
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <NewsletterSignup className="bg-white" lang={lang} dict={dictionary?.newsletter} />
                </div>
            </div>
            {filteredBlogs.length === 0 ? (
                <div className="text-center text-muted-foreground">
                    {t.noResults}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {filteredBlogs.map((blog) => {
                        const title = lang === 'es'
                            ? (blog.title_es || blog.title_en || blog.title)
                            : (blog.title_en || blog.title || blog.title_es)
                        const subtitle = lang === 'es'
                            ? (blog.subtitle_es || blog.subtitle_en || blog.subtitle)
                            : (blog.subtitle_en || blog.subtitle || blog.subtitle_es)
                        const createdLabel = mounted
                            ? `${t.created} ${formatDistanceToNow(formatDate(blog.createdAt), { addSuffix: true, locale: dateLocale })}`
                            : ''
                        const href = `/${lang}/blog/${blog.slug}`

                        return (
                            <article key={blog._id} className="h-full">
                                <Card className="relative h-full overflow-hidden border-slate-200 bg-white shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lg">
                                    <CardHeader className="relative space-y-3 pb-4">
                                        <span className="h-1 w-12 bg-[#FD4345]" aria-hidden="true" />
                                        <CardTitle className="text-xl leading-snug text-primary">
                                            <Link href={href} className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD4345] focus-visible:ring-offset-2">
                                                {highlight(title)}
                                            </Link>
                                        </CardTitle>
                                    <p className="text-muted-foreground text-sm">
                                        {highlight(subtitle)}
                                    </p>
                                    </CardHeader>
                                    <CardContent className="flex h-full flex-col">
                                        <div className="flex flex-wrap gap-2">
                                        {(() => {
                                            const { visible, hidden } = getTagDisplay(blog.tags)
                                            return (
                                                <>
                                                    {visible.map((tag) => (
                                                        <button
                                                            key={tag}
                                                            className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs hover:bg-primary/20"
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                setSearchQuery(tag)
                                                            }}
                                                            aria-label={`${t.filterByTagAria} ${tag}`}
                                                        >
                                                            {highlight(tag)}
                                                        </button>
                                                    ))}
                                                    {hidden.length > 0 && (
                                                        <span className="px-2 py-1 bg-primary/5 text-primary rounded-full text-xs">
                                                            +{hidden.length} {t.moreTags}
                                                        </span>
                                                    )}
                                                </>
                                            )
                                        })()}
                                    </div>
                                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-muted-foreground">
                                        {createdLabel ? (
                                            <span suppressHydrationWarning>{createdLabel}</span>
                                        ) : null}
                                        <span className="ml-auto uppercase text-xs tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t.languages}</span>
                                    </div>
                                        <Link href={href} className="mt-4 inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD4345] focus-visible:ring-offset-2">
                                            {t.readArticle}<ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                                        </Link>
                                    </CardContent>
                                </Card>
                            </article>
                        )
                    })}
                </div>
            )}
        </div>
    );
} 
