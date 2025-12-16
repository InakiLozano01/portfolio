import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Github, ArrowLeft, ExternalLink } from 'lucide-react'
import SkillIcon from '@/components/SkillIcon'
import mongoose from 'mongoose'
import DOMPurify from 'isomorphic-dompurify'
import { getProjectBySlug } from '@/lib/projects'
import BackNavigationHandler from '@/components/BackNavigationHandler'
import ShareActions from '@/components/ShareActions'
import { redirect } from 'next/navigation'
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

const getLocalizedProjectFields = (project: any, lang: SupportedLang, fallbackSlug: string) => ({
    title:
        lang === 'es'
            ? project?.title_es || project?.title_en || project?.title
            : project?.title_en || project?.title_es || project?.title,
    subtitle:
        lang === 'es'
            ? project?.subtitle_es || project?.subtitle_en || project?.subtitle
            : project?.subtitle_en || project?.subtitle_es || project?.subtitle,
    description:
        lang === 'es'
            ? project?.description_es || project?.description_en || project?.description
            : project?.description_en || project?.description_es || project?.description,
    slug: project?.slug || fallbackSlug
})

const buildThumbnailUrl = (thumbnail: string | undefined | null, baseUrl: string) => {
    if (!thumbnail) return `${baseUrl}/pfp.jpg`
    if (thumbnail.startsWith('http')) return thumbnail
    return `${baseUrl}${thumbnail.startsWith('/') ? thumbnail : `/${thumbnail}`}`
}

export async function generateMetadata({
    params
}: {
    params: { slug: string; lang: string }
}): Promise<Metadata> {
    const { slug, lang } = params
    const resolvedLang = normalizeLang(lang)
    const project = await getProjectBySlug(slug)
    const localized = getLocalizedProjectFields(project, resolvedLang, slug)

    const baseUrl = await resolveBaseUrl()
    const alternateBaseUrl = resolveAlternateBaseUrl(baseUrl)
    const { canonicalHost, englishHost, spanishHost } = selectHostsForLanguage(resolvedLang, baseUrl, alternateBaseUrl)
    const canonicalBase = canonicalHost || 'https://inakilozano.com'

    const enPath = `/en/projects/${localized.slug}`
    const esPath = `/es/projects/${localized.slug}`
    const canonicalPath = resolvedLang === 'es' ? esPath : enPath
    const canonicalUrl = `${canonicalBase}${normalizeCanonicalPath(canonicalPath)}`

    const description =
        buildMetaDescription(localized.subtitle, localized.description) ||
        (resolvedLang === 'es'
            ? 'Detalle de proyecto en el portafolio de Iñaki F. Lozano.'
            : 'Project detail on the Iñaki F. Lozano portfolio.')
    const pageTitle = localized.title
        ? `${localized.title} | Iñaki F. Lozano`
        : resolvedLang === 'es'
            ? 'Proyecto | Iñaki F. Lozano'
            : 'Project | Iñaki F. Lozano'
    const keywords = Array.isArray(project?.technologies)
        ? (project.technologies as any[]).map((tech) => (tech as any).name).filter(Boolean)
        : []
    const imageUrl = buildThumbnailUrl(project?.thumbnail, canonicalBase)
    const publishedTime = project?.createdAt ? new Date(project.createdAt).toISOString() : undefined
    const modifiedTime = project?.updatedAt ? new Date(project.updatedAt).toISOString() : undefined

    return {
        metadataBase: new URL(canonicalBase),
        title: pageTitle,
        description,
        keywords,
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
            type: 'website',
            locale: resolvedLang === 'es' ? 'es_AR' : 'en_US',
            title: pageTitle,
            description,
            siteName: 'Iñaki F. Lozano Portfolio',
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: localized.title || 'Project'
                }
            ],
            ...(publishedTime ? { publishedTime } : {}),
            ...(modifiedTime ? { modifiedTime } : {})
        },
        twitter: {
            card: 'summary_large_image',
            title: pageTitle,
            description,
            images: [imageUrl],
            creator: '@inakilozano',
            site: '@inakilozano'
        }
    }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

interface ISkill {
    _id: mongoose.Types.ObjectId;
    name: string;
    category: string;
    proficiency: number;
    yearsOfExperience: number;
    icon: string;
}

interface ProjectPageProps {
    params: Promise<{
        slug: string
        lang: 'en' | 'es'
    }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
    const { slug, lang } = await params
    const apiBase = process.env.NEXT_PUBLIC_APP_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const project =
        await getProjectBySlug(slug) ||
        (await (async () => {
            try {
                const res = await fetch(`${apiBase}/api/projects/slug/${encodeURIComponent(slug)}`, {
                    cache: 'no-store',
                })
                if (!res.ok) return null
                return res.json()
            } catch (err) {
                console.warn('Project API fallback failed', err)
                return null
            }
        })())

    if (!project) {
        redirect(`/${lang}#projects`)
    }

    const resolvedLang = normalizeLang(lang)
    const localized = getLocalizedProjectFields(project, resolvedLang, slug)
    const baseUrl = await resolveBaseUrl()
    const alternateBaseUrl = resolveAlternateBaseUrl(baseUrl)
    const { canonicalHost, englishHost, spanishHost } = selectHostsForLanguage(resolvedLang, baseUrl, alternateBaseUrl)
    const canonicalBase = canonicalHost || baseUrl

    const enPath = `/en/projects/${localized.slug}`
    const esPath = `/es/projects/${localized.slug}`
    const canonicalPath = resolvedLang === 'es' ? esPath : enPath
    const canonicalUrl = `${canonicalBase}${normalizeCanonicalPath(canonicalPath)}`
    const imageUrl = buildThumbnailUrl(project.thumbnail, canonicalBase)
    const metaDescription =
        buildMetaDescription(localized.subtitle, localized.description) ||
        (resolvedLang === 'es'
            ? 'Detalle de proyecto en el portafolio de Iñaki F. Lozano.'
            : 'Project detail on the Iñaki F. Lozano portfolio.')
    const technologyKeywords = Array.isArray(project.technologies)
        ? (project.technologies as any[]).map((tech) => (tech as any).name).filter(Boolean)
        : []

    const hostForLang = resolvedLang === 'es' ? spanishHost || canonicalBase : englishHost || canonicalBase
    const homePath = normalizeCanonicalPath(`/${resolvedLang === 'es' ? 'es' : 'en'}`)
    const projectsSectionPath = `${homePath}#projects`

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
                name: resolvedLang === 'es' ? 'Proyectos' : 'Projects',
                item: `${hostForLang}${projectsSectionPath}`
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: localized.title || project.title,
                item: canonicalUrl
            }
        ]
    }

    const projectJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: localized.title || project.title,
        headline: localized.subtitle || undefined,
        description: metaDescription,
        image: imageUrl,
        url: canonicalUrl,
        mainEntityOfPage: canonicalUrl,
        dateCreated: project.createdAt,
        dateModified: project.updatedAt,
        inLanguage: resolvedLang === 'es' ? 'es-AR' : 'en-US',
        author: {
            '@type': 'Person',
            name: 'Iñaki F. Lozano',
            url: canonicalBase
        },
        ...(technologyKeywords.length ? { keywords: technologyKeywords } : {}),
        ...(project.publicUrl ? { sameAs: [project.publicUrl] } : {})
    }

    return (
        <div className="flex min-h-screen bg-[#263547]">
            <BackNavigationHandler />
            <JsonLd data={breadcrumbJsonLd} />
            <JsonLd data={projectJsonLd} />

            <div className="hidden lg:block w-16 xl:w-24 bg-[#263547]" aria-hidden="true" />

            <div className="relative flex-1 overflow-x-hidden overflow-y-auto bg-white">
                <div className="pointer-events-none absolute inset-0 -z-10">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="project-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E5E5" strokeWidth="1.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#project-grid)" />
                    </svg>
                </div>

                <article className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
                    <Link
                        href={`/${lang}`}
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-6"
                    >
                        <ArrowLeft size={20} />
                        Back to Home
                    </Link>

                    <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-red-500 bg-clip-text text-transparent">
                        {localized.title}
                    </h1>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                        <p className="text-xl text-muted-foreground">{localized.subtitle}</p>
                        <ShareActions url={canonicalUrl} title={localized.title || project.title} />
                    </div>

                    {project.thumbnail && (
                        <div className="relative w-full mb-8">
                            <Image
                                src={project.thumbnail}
                                alt={localized.title}
                                width={1920}
                                height={1080}
                                className="w-full rounded-lg shadow-lg"
                                priority
                                placeholder="blur"
                                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTkyMCcgaGVpZ2h0PScxMDgwJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxyZWN0IGZpbGw9IiNlZWUiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4="
                            />
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-8 justify-center border-b border-[#263547]/20 pb-8">
                    {project.technologies.map((tech: any) => (
                            <Badge
                                key={(tech as any)._id.toString()}
                                variant="outline"
                                className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 inline-flex items-center gap-1"
                            >
                                <SkillIcon name={(tech as any).name} icon={(tech as any).icon} size={14} className="w-3.5 h-3.5" />
                                <span>{(tech as any).name}</span>
                            </Badge>
                        ))}
                    </div>

                    {project.githubUrl && (
                        <div className="mb-8 pb-8 border-b border-[#263547]/20">
                            <Link
                                href={project.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-primary hover:text-primary/80"
                            >
                                <Github size={20} />
                                View on GitHub
                            </Link>
                        </div>
                    )}
                    {project.publicUrl && (
                        <div className="mb-8 pb-8 border-b border-[#263547]/20">
                            <Link
                                href={project.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-primary hover:text-primary/80"
                            >
                                <ExternalLink size={20} />
                                Visit live site
                            </Link>
                        </div>
                    )}

                    <div
                        className="space-y-6 text-muted-foreground"
                        dangerouslySetInnerHTML={{
                            __html: (() => {
                                const allowedTags = [
                                    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'img', 'a', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'mark', 'span', 'br', 'hr', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'figure', 'figcaption', 'sub', 'sup'
                                ]
                                const allowedAttrs = ['href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class', 'style', 'loading']
                                const sanitized = DOMPurify.sanitize(localized.description || '', {
                                    ALLOWED_TAGS: allowedTags,
                                    ALLOWED_ATTR: allowedAttrs
                                })
                                return sanitized
                                    .replace(/<h1>/g, '<h1 class="text-3xl font-bold text-primary mt-10 mb-6">')
                                    .replace(/<h2>/g, '<h2 class="text-2xl font-semibold text-primary mt-8 mb-4">')
                                    .replace(/<h3>/g, '<h3 class="text-xl font-medium text-primary mt-6 mb-3">')
                                    .replace(/<p>/g, '<p class="leading-relaxed mb-4">')
                                    .replace(/<ul>/g, '<ul class="list-disc list-inside space-y-2 ml-4">')
                                    .replace(/<ol>/g, '<ol class="list-decimal list-inside space-y-2 ml-4">')
                                    .replace(/<blockquote>/g, '<blockquote class="border-l-4 border-primary/30 pl-4 italic">')
                                    .replace(/<pre>/g, '<pre class="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto my-4">')
                                    .replace(/<code>/g, '<code class="bg-gray-100 text-gray-800 rounded px-1 py-0.5">')
                                    .replace(/<table>/g, '<table class="w-full border-collapse my-4">')
                                    .replace(/<th>/g, '<th class="border px-3 py-2 bg-gray-50 text-left">')
                                    .replace(/<td>/g, '<td class="border px-3 py-2">')
                                    .replace(/<img/g, '<img class="rounded-lg shadow-lg my-4 max-w-full h-auto"')
                                    .replace(/\n/g, '<br />')
                            })()
                        }}
                    />
                </article>
            </div>

            <div className="hidden lg:block w-16 xl:w-24 bg-[#263547]" aria-hidden="true" />
        </div>
    )
} 
