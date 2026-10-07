import Image from 'next/image'
import Link from 'next/link'
import { Github, ArrowLeft, ExternalLink } from 'lucide-react'
import SkillIcon from '@/components/SkillIcon'
import DOMPurify from 'isomorphic-dompurify'
import { getProjectBySlug } from '@/lib/projects'
import { getDictionary } from '@/lib/dictionary'
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
import DetailShell from '@/components/synapse/DetailShell'
import { getCachedSections } from '@/lib/cache'

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
    params: Promise<{ slug: string; lang: string }>
}): Promise<Metadata> {
    const { slug, lang } = await params
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

export const revalidate = 300

// Cache public case studies on first request; the build has no database access.
export function generateStaticParams() {
    return []
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
    const dict = await getDictionary(resolvedLang)
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

    const contactSection = await getCachedSections('contact').catch(() => [])
    const contact = Array.isArray(contactSection) ? (contactSection[0] as any)?.content ?? null : null

    return (
        <DetailShell lang={lang} dictionary={dict} contact={JSON.parse(JSON.stringify(contact))}>
            <BackNavigationHandler />
            <JsonLd data={breadcrumbJsonLd} />
            <JsonLd data={projectJsonLd} />
            <div className="field-navy">
            <div className="mx-auto max-w-5xl px-5 pb-36 pt-32 sm:px-8 lg:pt-40">
                <Link
                    href={`/${lang}#projects`}
                    prefetch={false}
                    className="group inline-flex items-center gap-2 text-sm text-fg-dim transition-colors hover:text-fg"
                >
                    <ArrowLeft size={16} strokeWidth={1.75} className="transition-transform group-hover:-translate-x-0.5" />
                    {dict.projects?.view?.backToHome || 'Back to Home'}
                </Link>

                <h1 className="mt-8 max-w-[20ch] text-[clamp(2.4rem,5.5vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-fg text-balance">
                    {localized.title}
                </h1>
                {localized.subtitle && <p className="mt-6 max-w-[60ch] text-xl leading-relaxed text-fg-soft">{localized.subtitle}</p>}

                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                    {project.publicUrl && (
                        <Link
                            href={project.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-11 items-center gap-2 rounded-full bg-action px-5 text-sm font-medium text-action-fg transition-colors hover:bg-coral"
                        >
                            <ExternalLink size={16} strokeWidth={1.75} />
                            {dict.projects?.view?.visitLiveSite || 'Visit live site'}
                        </Link>
                    )}
                    {project.githubUrl && (
                        <Link
                            href={project.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-11 items-center gap-2 rounded-full border border-line/15 px-5 text-sm font-medium text-fg transition-colors hover:border-line/40"
                        >
                            <Github size={16} strokeWidth={1.75} />
                            {dict.projects?.view?.viewOnGithub || 'View on GitHub'}
                        </Link>
                    )}
                    <ShareActions url={canonicalUrl} title={localized.title || project.title} dict={dict.share} />
                </div>
            </div>
            </div>

            <article className="relative mx-auto max-w-5xl px-5 pb-24 sm:px-8">
                {project.thumbnail && (
                    <div className="relative -mt-24 overflow-hidden rounded-2xl ring-1 ring-line/10">
                        <Image
                            src={project.thumbnail}
                            unoptimized={project.thumbnail.startsWith('/images/projects/') && /\.webp$/i.test(project.thumbnail)}
                            alt={localized.title}
                            width={1920}
                            height={1080}
                            sizes="(max-width: 1024px) calc(100vw - 40px), 960px"
                            className="h-auto w-full"
                            priority
                            placeholder="blur"
                            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTYnIGhlaWdodD0nOScgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48cmVjdCBmaWxsPSIjZjBlY2U2IiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+"
                        />
                    </div>
                )}

                <ul className="mt-10 flex flex-wrap gap-2" aria-label={dict.projects?.filtersLabel || 'Technologies'}>
                    {project.technologies.map((tech: any) => (
                        <li
                            key={(tech as any)._id.toString()}
                            className="inline-flex h-9 items-center gap-2 rounded-full border border-line/10 px-3.5 text-sm text-fg-soft"
                        >
                            <SkillIcon name={(tech as any).name} icon={(tech as any).icon} size={14} className="h-3.5 w-3.5 text-fg/80" />
                            <span>{(tech as any).name}</span>
                        </li>
                    ))}
                </ul>

                <div className="mt-14 border-t border-line/[0.08] pt-14">
                    <div
                        className="synapse-prose max-w-[72ch]"
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
                                // Plain-text descriptions keep their line breaks; HTML ones already carry structure.
                                const isHtml = /<(p|ul|ol|h[1-6]|div|li|table|blockquote)\b/i.test(sanitized)
                                const html = sanitized
                                    .replace(/<h1>/g, '<h1 class="text-3xl font-semibold mt-10 mb-6">')
                                    .replace(/<h2>/g, '<h2 class="text-2xl font-semibold mt-10 mb-4">')
                                    .replace(/<h3>/g, '<h3 class="text-xl font-medium mt-8 mb-3">')
                                    .replace(/<p>/g, '<p class="leading-relaxed mb-4">')
                                    .replace(/<ul>/g, '<ul class="list-disc pl-5 space-y-1.5">')
                                    .replace(/<ol>/g, '<ol class="list-decimal pl-5 space-y-1.5">')
                                    .replace(/<blockquote>/g, '<blockquote class="pl-4 italic">')
                                    .replace(/<pre>/g, '<pre class="rounded-xl p-4 overflow-x-auto my-4">')
                                    .replace(/<code>/g, '<code class="rounded px-1 py-0.5">')
                                    .replace(/<table>/g, '<table class="w-full border-collapse my-4">')
                                    .replace(/<th>/g, '<th class="border px-3 py-2 text-left">')
                                    .replace(/<td>/g, '<td class="border px-3 py-2">')
                                    .replace(/<img/g, '<img loading="lazy" decoding="async" class="rounded-xl my-6 max-w-full h-auto"')
                                return isHtml ? html : html.replace(/\n/g, '<br />')
                            })()
                        }}
                    />
                </div>
            </article>
        </DetailShell>
    )
} 
