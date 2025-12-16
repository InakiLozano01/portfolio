import { getBlogBySlug } from '@/lib/blog'
import { notFound } from 'next/navigation'
// content rendering moved to client component
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BackNavigationHandler from '@/components/BackNavigationHandler'
import BlogComments from '@/components/BlogComments'
import ShareActions from '@/components/ShareActions'
import BlogArticle from '@/components/BlogArticle'
import NewsletterSignup from '@/components/NewsletterSignup'
import { PublishedInfo } from '@/components/PublishedInfo'
import type { Metadata } from 'next'
import {
    buildLanguageAlternateUrls,
    buildMetaDescription,
    normalizeCanonicalPath,
    resolveAlternateBaseUrl,
    resolveBaseUrl,
    selectHostsForLanguage
} from '@/lib/seo'
import { JsonLd } from '@/components/JsonLd'

type SupportedLang = 'en' | 'es'

const normalizeLang = (lang: string): SupportedLang => (lang === 'es' ? 'es' : 'en')

const getLocalizedBlogFields = (blog: any, lang: SupportedLang, fallbackSlug: string) => ({
    title:
        lang === 'es'
            ? blog?.title_es || blog?.title_en || blog?.title
            : blog?.title_en || blog?.title_es || blog?.title,
    subtitle:
        lang === 'es'
            ? blog?.subtitle_es || blog?.subtitle_en || blog?.subtitle
            : blog?.subtitle_en || blog?.subtitle_es || blog?.subtitle,
    content:
        lang === 'es'
            ? blog?.content_es || blog?.content_en || blog?.content
            : blog?.content_en || blog?.content_es || blog?.content,
    slug: blog?.slug || fallbackSlug
})

export async function generateMetadata({
    params
}: {
    params: { slug: string; lang: string }
}): Promise<Metadata> {
    const { slug, lang } = params
    const resolvedLang = normalizeLang(lang)
    const blog = await getBlogBySlug(slug)
    const { title, subtitle, content, slug: finalSlug } = getLocalizedBlogFields(blog, resolvedLang, slug)

    const baseUrl = await resolveBaseUrl()
    const alternateBaseUrl = resolveAlternateBaseUrl(baseUrl)
    const { canonicalHost, englishHost, spanishHost } = selectHostsForLanguage(resolvedLang, baseUrl, alternateBaseUrl)
    const canonicalBase = canonicalHost || 'https://inakilozano.com'

    const enPath = `/en/blog/${finalSlug}`
    const esPath = `/es/blog/${finalSlug}`
    const canonicalPath = resolvedLang === 'es' ? esPath : enPath
    const canonicalUrl = `${canonicalBase}${normalizeCanonicalPath(canonicalPath)}`

    const description =
        buildMetaDescription(subtitle, content) ||
        (resolvedLang === 'es'
            ? 'Artículo del blog en el portafolio de Iñaki F. Lozano.'
            : 'Blog article on the Iñaki F. Lozano portfolio.')
    const pageTitle = title ? `${title} | Iñaki F. Lozano` : `Blog | Iñaki F. Lozano`
    const tags = Array.isArray(blog?.tags) ? blog.tags : []

    return {
        metadataBase: new URL(canonicalBase),
        title: pageTitle,
        description,
        keywords: tags,
        alternates: {
            canonical: canonicalUrl,
            languages: buildLanguageAlternateUrls(
                englishHost || canonicalBase,
                spanishHost || canonicalBase,
                enPath,
                esPath
            )
        },
        openGraph: {
            url: canonicalUrl,
            type: 'article',
            locale: resolvedLang === 'es' ? 'es_AR' : 'en_US',
            title: pageTitle,
            description,
            siteName: 'Iñaki F. Lozano Portfolio',
            images: [
                {
                    url: `${canonicalBase}/pfp.jpg`,
                    width: 1200,
                    height: 630,
                    alt: 'Iñaki F. Lozano'
                }
            ],
            ...(blog?.createdAt ? { publishedTime: blog.createdAt } : {}),
            ...(blog?.updatedAt ? { modifiedTime: blog.updatedAt } : {})
        },
        twitter: {
            card: 'summary_large_image',
            title: pageTitle,
            description,
            images: [`${canonicalBase}/pfp.jpg`],
            creator: '@inakilozano',
            site: '@inakilozano'
        }
    }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

interface BlogPageProps {
    params: {
        slug: string
        lang: 'en' | 'es'
    },
    searchParams?: {
        [key: string]: string | string[] | undefined
    }
}

export default async function BlogPage({ params, searchParams }: BlogPageProps) {
    const blog = await getBlogBySlug(params.slug)

    if (!blog) {
        notFound()
    }

    const resolvedLang = normalizeLang(params.lang)
    const localized = getLocalizedBlogFields(blog, resolvedLang, params.slug)
    const baseUrl = await resolveBaseUrl()
    const alternateBaseUrl = resolveAlternateBaseUrl(baseUrl)
    const { canonicalHost, englishHost, spanishHost } = selectHostsForLanguage(resolvedLang, baseUrl, alternateBaseUrl)
    const canonicalBase = canonicalHost || baseUrl

    const enPath = `/en/blog/${localized.slug}`
    const esPath = `/es/blog/${localized.slug}`
    const canonicalPath = resolvedLang === 'es' ? esPath : enPath
    const canonicalUrl = `${canonicalBase}${normalizeCanonicalPath(canonicalPath)}`
    const metaDescription =
        buildMetaDescription(localized.subtitle, localized.content) ||
        (resolvedLang === 'es'
            ? 'Artículo del blog en el portafolio de Iñaki F. Lozano.'
            : 'Blog article on the Iñaki F. Lozano portfolio.')
    const keywords = Array.isArray(blog.tags) ? blog.tags : []

    const preferredLangParam = (() => {
        const lang = searchParams?.lang
        if (!lang) return undefined
        if (Array.isArray(lang)) {
            return lang[0]?.toLowerCase()
        }
        return lang.toLowerCase()
    })()

    const blogHasEnglish = typeof blog.content_en === 'string' ? blog.content_en.trim().length > 0 : false
    const blogHasSpanish = typeof blog.content_es === 'string' ? blog.content_es.trim().length > 0 : false

    const initialLang: 'en' | 'es' = (() => {
        if (preferredLangParam === 'es') return 'es'
        if (preferredLangParam === 'en') return 'en'
        if (resolvedLang === 'es' && blogHasSpanish) return 'es'
        if (resolvedLang === 'en' && blogHasEnglish) return 'en'
        if (blogHasSpanish) return 'es'
        if (blogHasEnglish) return 'en'
        return resolvedLang
    })()

    const hostForLang = resolvedLang === 'es' ? spanishHost || canonicalBase : englishHost || canonicalBase
    const homePath = normalizeCanonicalPath(`/${resolvedLang === 'es' ? 'es' : 'en'}`)
    const blogSectionPath = `${homePath}#blog`

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: resolvedLang === 'es' ? 'Inicio' : 'Home',
                item: `${hostForLang}${homePath}`
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Blog',
                item: `${hostForLang}${blogSectionPath}`
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: localized.title || blog.title,
                item: canonicalUrl
            }
        ]
    }

    const blogPostingJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: localized.title || blog.title,
        alternativeHeadline: localized.subtitle || undefined,
        description: metaDescription,
        image: `${canonicalBase}/pfp.jpg`,
        url: canonicalUrl,
        mainEntityOfPage: canonicalUrl,
        datePublished: blog.createdAt,
        dateModified: blog.updatedAt,
        inLanguage: resolvedLang === 'es' ? 'es-AR' : 'en-US',
        author: {
            '@type': 'Person',
            name: 'Iñaki F. Lozano',
            url: canonicalBase
        },
        publisher: {
            '@type': 'Organization',
            name: 'Iñaki F. Lozano Portfolio',
            logo: {
                '@type': 'ImageObject',
                url: `${canonicalBase}/favicon-256x256.png`
            }
        },
        ...(keywords.length ? { keywords } : {})
    }

    return (
        <div className="flex min-h-screen bg-[#263547]">
            <BackNavigationHandler />
            <JsonLd data={breadcrumbJsonLd} />
            <JsonLd data={blogPostingJsonLd} />

            <div className="hidden lg:block w-16 xl:w-24 bg-[#263547]" aria-hidden="true" />

            <div className="relative flex-1 overflow-x-hidden overflow-y-auto bg-white">
                <div className="pointer-events-none absolute inset-0 -z-10">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="blog-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E5E5" strokeWidth="1.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#blog-grid)" />
                    </svg>
                </div>

                <article className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
                    <Link
                        href={`/${params.lang}`}
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-6"
                    >
                        <ArrowLeft size={20} />
                        Back to Home
                    </Link>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-8">
                        <PublishedInfo createdAt={blog.createdAt} updatedAt={blog.updatedAt} />
                        <ShareActions url={canonicalUrl} title={localized.title || blog.title} />
                    </div>

                    <BlogArticle blog={blog as any} initialLang={initialLang} />

                    <div className="my-10">
                        <NewsletterSignup compact lang={initialLang} />
                    </div>

                    <BlogComments blogId={blog._id} />
                </article>
            </div>

            <div className="hidden lg:block w-16 xl:w-24 bg-[#263547]" aria-hidden="true" />
        </div>
    )
}
