'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
// Removed unused imports
import { type Blog } from '@/models/BlogClient'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { es as esLocale } from 'date-fns/locale'
import { formatDate } from '@/lib/utils'
import NewsletterSignup from '@/components/NewsletterSignup'

const copy = {
    en: {
        heading: 'Blog',
        descriptionFallback: 'Stories, updates, and research notes.',
        searchPlaceholder: 'Search blogs...',
        error: 'Error',
        comingSoonTitle: 'Coming Soon! 🚀',
        comingSoonCopy: "We're preparing some exciting content for you. Stay tuned!",
        noResults: 'No blogs found matching your search.',
        created: 'Created',
        languages: 'EN / ES',
    },
    es: {
        heading: 'Blog',
        descriptionFallback: 'Historias, novedades y notas de investigación.',
        searchPlaceholder: 'Buscar blogs...',
        error: 'Error',
        comingSoonTitle: '¡Próximamente! 🚀',
        comingSoonCopy: 'Estamos preparando contenido increíble para ti. ¡Mantente atento!',
        noResults: 'No se encontraron blogs que coincidan con tu búsqueda.',
        created: 'Creado',
        languages: 'EN / ES',
    },
} as const

export default function BlogSection({ lang = 'en' }: { lang?: 'en' | 'es' }) {
    const t = copy[lang] ?? copy.en
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sectionTitleBase, setSectionTitleBase] = useState('');
    const [sectionTitleEn, setSectionTitleEn] = useState('');
    const [sectionTitleEs, setSectionTitleEs] = useState('');
    const [sectionDescription, setSectionDescription] = useState('');
    const [sectionDescriptionEn, setSectionDescriptionEn] = useState('');
    const [sectionDescriptionEs, setSectionDescriptionEs] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        async function fetchBlogs() {
            try {
                const [sectionResponse, response] = await Promise.all([
                    fetch('/api/sections/blog'),
                    fetch('/api/blogs')
                ]);

                if (sectionResponse.ok) {
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
                    throw new Error('Failed to fetch blogs');
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
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        }

        fetchBlogs();
    }, []);

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

    // Using Link for prefetch and accessibility

    const maxVisibleTags = 6

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
        <div className="container mx-auto py-8 px-4">
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-primary">{heading}</h2>
                {sectionCopy && <p className="text-muted-foreground mt-1">{sectionCopy}</p>}
            </div>
            <div className="mb-8">
                <Input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md mx-auto bg-white text-black placeholder:text-gray-500"
                />
                <div className="mt-4 max-w-2xl mx-auto">
                    <NewsletterSignup className="bg-white" lang={lang} />
                </div>
            </div>
            {filteredBlogs.length === 0 ? (
                <div className="text-center text-muted-foreground">
                    {t.noResults}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                            <Link key={blog._id} href={href} prefetch={true} className="block">
                            <Card className="hover:shadow-lg hover:bg-primary/5 transition-shadow duration-200 overflow-hidden group">
                                <CardHeader className="relative space-y-2">
                                    <CardTitle className="text-xl bg-gradient-to-r from-primary to-red-500 bg-clip-text text-transparent">
                                        {highlight(title)}
                                    </CardTitle>
                                    <p className="text-muted-foreground text-sm">
                                        {highlight(subtitle)}
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2 mb-4">
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
                                                            aria-label={`Filter by tag ${tag}`}
                                                        >
                                                            {highlight(tag)}
                                                        </button>
                                                    ))}
                                                    {hidden.length > 0 && (
                                                        <span className="px-2 py-1 bg-primary/5 text-primary rounded-full text-xs">
                                                            +{hidden.length} more
                                                        </span>
                                                    )}
                                                </>
                                            )
                                        })()}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        {createdLabel ? (
                                            <span suppressHydrationWarning>{createdLabel}</span>
                                        ) : null}
                                        <span className="uppercase text-xs tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t.languages}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                        )
                    })}
                </div>
            )}
        </div>
    );
} 
