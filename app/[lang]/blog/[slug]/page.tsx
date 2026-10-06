import { getBlogBySlug } from '@/lib/blog'
import { getDictionary } from '@/lib/dictionary'
import { notFound } from 'next/navigation'
// content rendering moved to client component
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BackNavigationHandler from '@/components/BackNavigationHandler'
import BlogComments from '@/components/BlogComments'
import ShareActions from '@/components/ShareActions'
import BlogArticle from '@/components/BlogArticle'
import NewsletterInline from '@/components/synapse/NewsletterInline'
import DetailShell from '@/components/synapse/DetailShell'
import { getCachedSections } from '@/lib/cache'
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
    params: Promise<{ slug: string; lang: string }>
}): Promise<Metadata> {
    const { slug, lang } = await params
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
    const shareImage = `${canonicalBase}/og-${resolvedLang === 'es' ? 'es' : 'en'}.png`

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
                    url: shareImage,
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
            images: [shareImage],
            creator: '@inakilozano',
            site: '@inakilozano'
        }
    }
}

export const revalidate = 300

interface BlogPageProps {
    params: Promise<{
        slug: string
        lang: 'en' | 'es'
    }>
    searchParams?: Promise<{
        [key: string]: string | string[] | undefined
    }>
}

export default async function BlogPage({ params, searchParams }: BlogPageProps) {
    const { slug, lang } = await params
    const resolvedSearchParams = searchParams ? await searchParams : {}
    const blog = await getBlogBySlug(slug)

    if (!blog) {
        notFound()
    }

    const resolvedLang = normalizeLang(lang)
    const dict = await getDictionary(resolvedLang)
    const localized = getLocalizedBlogFields(blog, resolvedLang, slug)
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
        const selectedLang = resolvedSearchParams?.lang
        if (!selectedLang) return undefined
        if (Array.isArray(selectedLang)) {
            return selectedLang[0]?.toLowerCase()
        }
        return selectedLang.toLowerCase()
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

    const contactSection = await getCachedSections('contact').catch(() => [])
    const contact = Array.isArray(contactSection) ? (contactSection[0] as any)?.content ?? null : null

    return (
        <DetailShell lang={resolvedLang} dictionary={dict} contact={JSON.parse(JSON.stringify(contact))}>
            <BackNavigationHandler />
            <JsonLd data={breadcrumbJsonLd} />
            <JsonLd data={blogPostingJsonLd} />
            <article className="relative mx-auto max-w-3xl px-5 pb-24 pt-32 sm:px-8 lg:pt-40">
                <Link
                    href={`/${resolvedLang}#blog`}
                    prefetch={false}
                    className="group inline-flex items-center gap-2 text-sm text-fg-dim transition-colors hover:text-fg"
                >
                    <ArrowLeft size={16} strokeWidth={1.75} className="transition-transform group-hover:-translate-x-0.5" />
                    {dict.blog?.view?.backToHome || 'Back to Home'}
                </Link>

                <div className="mb-10 mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <PublishedInfo createdAt={blog.createdAt} updatedAt={blog.updatedAt} lang={resolvedLang} dict={dict.blog?.view} />
                    <ShareActions url={canonicalUrl} title={localized.title || blog.title} dict={dict.share} />
                </div>

                <BlogArticle blog={blog as any} initialLang={initialLang} dict={dict.blog?.view} />

                <div className="my-16 rounded-3xl border border-line/[0.08] bg-surface p-6 sm:p-8">
                    <NewsletterInline lang={initialLang} dict={dict.newsletter} />
                </div>

                <BlogComments blogId={blog._id} lang={resolvedLang} dict={dict.blog?.comments} />
            </article>
        </DetailShell>
    )
}
