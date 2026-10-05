'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import SkillIcon from '@/components/SkillIcon'
import type { IProject } from '@/models/Project'
import type { Document, Types } from 'mongoose'
import { ExternalLink } from 'lucide-react'
import { slugify } from '@/lib/utils'

interface Skill extends Document {
    _id: Types.ObjectId;
    name: string;
    category: string;
  icon: string;
}

interface ProjectWithTechnologies extends Omit<IProject, 'technologies'> {
  _id: Types.ObjectId;
  technologies: Skill[];
}

export default function Projects({ lang = 'en', initialProjects, dictionary = {} }: { lang?: 'en' | 'es'; initialProjects?: ProjectWithTechnologies[]; dictionary?: any }) {
    const projectsDict = dictionary?.projects || {}
    const t = {
        heading: projectsDict.heading || 'Projects',
        all: projectsDict.all || 'All',
        loadingError: projectsDict.loadingError || 'Failed to load projects',
        filtersLabel: projectsDict.filtersLabel || 'Filter projects by technology',
        viewProject: projectsDict.viewProject || 'View project',
        visitProject: projectsDict.visitProject || 'Visit project',
        thumbnailAlt: projectsDict.thumbnailAlt || 'Thumbnail image for project',
        principalProject: projectsDict.principalProject || 'Ethos is the principal independent product project developed and operated by Iñaki Fernando Lozano.',
        visitEthos: projectsDict.visitEthos || 'Visit Ethos',
    }
    const [projects, setProjects] = useState<ProjectWithTechnologies[]>(initialProjects || [])
    const [isLoading, setIsLoading] = useState(!initialProjects)
    const [error, setError] = useState<string | null>(null)
    const [techFilter, setTechFilter] = useState<string>('all')
    const [availableTechs, setAvailableTechs] = useState<{ name: string, count: number }[]>([])
    const pickLang = (enValue?: string, esValue?: string, fallback?: string) =>
        lang === 'es'
            ? (esValue || enValue || fallback || '')
            : (enValue || esValue || fallback || '')

    useEffect(() => {
        if (initialProjects) {
            return
        }

        const fetchProjects = async () => {
            try {
                const response = await fetch('/api/projects')
                if (!response.ok) throw new Error('Failed to fetch projects')
                const data = await response.json()
                setProjects(data)
            } catch (err) {
                setError(t.loadingError)
                console.error('Error loading projects:', err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchProjects()
    }, [initialProjects, t.loadingError])

    useEffect(() => {
        const counts = new Map<string, number>()
        projects.forEach((project) => project.technologies.forEach((technology) => {
            counts.set(technology.name, (counts.get(technology.name) || 0) + 1)
        }))
        setAvailableTechs(Array.from(counts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name)))
    }, [projects])

    if (isLoading) {
        return (
            <div className="w-full">
                <h2 className="text-3xl md:text-4xl font-bold tracking-display mb-8 text-primary">{t.heading}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="h-48 bg-gray-200 dark:bg-gray-700" />
                            <CardContent className="space-y-4">
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                                <div className="flex gap-2">
                                    {[1, 2, 3].map((j) => (
                                        <div
                                            key={j}
                                            className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="w-full">
                <h2 className="text-3xl md:text-4xl font-bold tracking-display mb-8 text-primary">{t.heading}</h2>
                <div className="text-center text-red-500">{error}</div>
            </div>
        )
    }

    const filteredProjects = techFilter === 'all' ? projects : projects.filter(p => p.technologies.some(t => t.name === techFilter))

    const resolveSlug = (project: ProjectWithTechnologies) => {
        const rawSlug = project.slug?.trim()
        if (rawSlug && rawSlug !== 'undefined') return rawSlug
        const fallbackSource =
            project.title ||
            project.title_en ||
            project.title_es ||
            project.subtitle ||
            project.subtitle_en ||
            project.subtitle_es ||
            ''
        return fallbackSource ? slugify(fallbackSource) : ''
    }

    const sanitizePublicUrl = (url?: string | null) => {
        const trimmed = url?.trim()
        if (!trimmed) return null
        const lowered = trimmed.toLowerCase()
        if (lowered === 'undefined' || lowered === 'null' || lowered === 'none' || lowered === '#') {
            return null
        }
        return trimmed
    }

    return (
        <div className="w-full">
            <div className="mb-3 flex items-end gap-4">
                <h2 className="text-3xl md:text-4xl font-bold tracking-display text-primary">{t.heading}</h2>
                <span className="mb-1 h-1 w-16 bg-[#FD4345]" aria-hidden="true" />
            </div>
            <p className="mb-6 max-w-2xl text-sm leading-6 text-slate-600">
                {t.principalProject}{' '}
                <a
                    href="https://ethos.ar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline decoration-[#FD4345] decoration-2 underline-offset-4 transition-colors hover:text-[#FD4345] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD4345] focus-visible:ring-offset-2"
                >
                    {t.visitEthos}
                </a>
            </p>
            <div className="flex flex-wrap gap-2 mb-6" aria-label={t.filtersLabel}>
                <button
                    onClick={() => setTechFilter('all')}
                    className={`px-3 py-2 rounded-full text-sm font-medium ${techFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    {t.all} <span className="ml-1 text-xs opacity-70">{projects.length}</span>
                </button>
                {availableTechs.map(t => (
                    <button
                        key={t.name}
                        onClick={() => setTechFilter(t.name)}
                        className={`px-3 py-2 rounded-full text-sm font-medium ${techFilter === t.name ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        {t.name} <span className="ml-1 text-xs opacity-70">{t.count}</span>
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-rows-fr gap-6">
                {filteredProjects.map((project) => {
                    const slug = resolveSlug(project)
                    if (!slug) {
                        console.warn('Skipping project without slug', project._id?.toString?.())
                        return null
                    }
                    const publicUrl = sanitizePublicUrl(project.publicUrl)
                    const projectHref = `/${lang}/projects/${slug}`
                    const title = pickLang(project.title_en || project.title, project.title_es || project.title, project.title)

                    return (
                        <article
                            key={project._id.toString()}
                            className="h-full"
                        >
                            <Card className="relative h-full overflow-hidden rounded-xl border-navy/15 bg-white transition-colors duration-200 hover:border-bordeaux/40">
                                <Link
                                    href={projectHref}
                                    prefetch={false}
                                    aria-label={`${t.viewProject} ${title}`}
                                    className="absolute inset-0 z-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
                                />
                                <span className="absolute left-0 top-0 z-20 h-1 w-16 bg-[#FD4345]" aria-hidden="true" />
                                <div className="relative aspect-video w-full">
                                    <Image
                                        src={project.thumbnailSmall || project.thumbnail || '/images/projects/default-project.jpg'}
                                        alt={`${t.thumbnailAlt} ${pickLang(project.title_en || project.title, project.title_es || project.title, project.title)}`}
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                                        className="object-cover transition-transform duration-300 hover:scale-[1.02]"
                                        loading="lazy"
                                        priority={false}
                                        placeholder="blur"
                                        blurDataURL={project.thumbnailBlur || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nNjQwJyBoZWlnaHQ9JzM2MCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48cmVjdCBmaWxsPSIjZWVlIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+"}
                                    />
                                </div>
                                <CardHeader className="flex-grow">
                                    <CardTitle className="line-clamp-1">
                                        {title}
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {pickLang(project.subtitle_en || project.subtitle, project.subtitle_es || project.subtitle, project.subtitle)}
                                    </p>
                                    {publicUrl && (
                                        <a
                                            href={publicUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="relative z-20 mt-2 inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                                            onClick={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => e.stopPropagation()}
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            {t.visitProject}
                                        </a>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {project.technologies.slice(0, 5).map((tech) => (
                                            <Badge
                                                key={tech._id.toString()}
                                                variant="outline"
                                                className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 inline-flex items-center gap-1"
                                            >
                                                <SkillIcon name={tech.name} icon={tech.icon} size={14} className="w-3.5 h-3.5" />
                                                <span>{tech.name}</span>
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </article>
                    )
                })}
            </div>
        </div>
    )
} 
