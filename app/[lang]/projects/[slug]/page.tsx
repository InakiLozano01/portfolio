import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Github, ArrowLeft, ExternalLink } from 'lucide-react'
import { IProject } from '@/models/Project'
import SkillIcon from '@/components/SkillIcon'
import mongoose from 'mongoose'
import DOMPurify from 'isomorphic-dompurify'
import { getProjectBySlug } from '@/lib/projects'
import BackNavigationHandler from '@/components/BackNavigationHandler'
import ShareActions from '@/components/ShareActions'
import { redirect } from 'next/navigation'

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
    params: {
        slug: string
        lang: 'en' | 'es'
    }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
    const apiBase = process.env.NEXT_PUBLIC_APP_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const project =
        await getProjectBySlug(params.slug) ||
        (await (async () => {
            try {
                const res = await fetch(`${apiBase}/api/projects/slug/${encodeURIComponent(params.slug)}`, {
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
        redirect(`/${params.lang}#projects`)
    }

    const title =
        params.lang === 'es'
            ? project.title_es || project.title_en || project.title
            : project.title_en || project.title_es || project.title
    const subtitle =
        params.lang === 'es'
            ? project.subtitle_es || project.subtitle_en || project.subtitle
            : project.subtitle_en || project.subtitle_es || project.subtitle
    const description =
        params.lang === 'es'
            ? project.description_es || project.description_en || project.description
            : project.description_en || project.description_es || project.description

    return (
        <div className="flex min-h-screen bg-[#263547]">
            <BackNavigationHandler />

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
                        href={`/${params.lang}`}
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-6"
                    >
                        <ArrowLeft size={20} />
                        Back to Home
                    </Link>

                    <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-red-500 bg-clip-text text-transparent">
                        {title}
                    </h1>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                        <p className="text-xl text-muted-foreground">{subtitle}</p>
                        <ShareActions url={`${process.env.NEXT_PUBLIC_APP_URL || ''}/${params.lang}/projects/${project.slug}`} title={title} />
                    </div>

                    {project.thumbnail && (
                        <div className="relative w-full mb-8">
                            <Image
                                src={project.thumbnail}
                                alt={title}
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
                                const sanitized = DOMPurify.sanitize(description || '', {
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
