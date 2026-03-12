'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import SkillIcon from '@/components/SkillIcon'
import type { IProject } from '@/models/Project'
import type { Document, Types } from 'mongoose'
import { ExternalLink, ArrowUpRight } from 'lucide-react'
import { slugify } from '@/lib/utils'
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/scroll-reveal'

interface Skill extends Document {
	_id: Types.ObjectId
	name: string
	category: string
	proficiency: number
	yearsOfExperience: number
	icon: string
}

interface ProjectWithTechnologies extends Omit<IProject, 'technologies'> {
	_id: Types.ObjectId
	technologies: Skill[]
}

const copy = {
	en: {
		heading: 'Projects',
		all: 'All',
		loadingError: 'Failed to load projects',
		filtersLabel: 'Filter projects by technology',
	},
	es: {
		heading: 'Proyectos',
		all: 'Todos',
		loadingError: 'No se pudieron cargar los proyectos',
		filtersLabel: 'Filtrar proyectos por tecnologia',
	},
} as const

export default function Projects({ lang = 'en' }: { lang?: 'en' | 'es' }) {
	const t = copy[lang] ?? copy.en
	const [projects, setProjects] = useState<ProjectWithTechnologies[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [techFilter, setTechFilter] = useState<string>('all')
	const [availableTechs, setAvailableTechs] = useState<{ name: string; count: number }[]>([])
	const pickLang = (enValue?: string, esValue?: string, fallback?: string) =>
		lang === 'es'
			? (esValue || enValue || fallback || '')
			: (enValue || esValue || fallback || '')

	useEffect(() => {
		const fetchProjects = async () => {
			try {
				const response = await fetch('/api/projects')
				if (!response.ok) throw new Error('Failed to fetch projects')
				const data = await response.json()
				setProjects(data)
				const counts = new Map<string, number>()
				data.forEach((p: ProjectWithTechnologies) =>
					p.technologies.forEach(t => {
						counts.set(t.name, (counts.get(t.name) || 0) + 1)
					}),
				)
				setAvailableTechs(
					Array.from(counts.entries())
						.map(([name, count]) => ({ name, count }))
						.sort((a, b) => a.name.localeCompare(b.name)),
				)
			} catch (err) {
				setError(t.loadingError)
				console.error('Error loading projects:', err)
			} finally {
				setIsLoading(false)
			}
		}

		fetchProjects()
	}, [t])

	if (isLoading) {
		return (
			<section>
				<h2 className="text-3xl md:text-4xl font-bold mb-8 text-navy tracking-display">{t.heading}</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
					{[1, 2, 3].map((i) => (
						<div key={i} className="animate-pulse rounded-xl overflow-hidden">
							<div className="aspect-video bg-navy/5" />
							<div className="p-5 space-y-3">
								<div className="h-5 bg-navy/5 rounded w-3/4" />
								<div className="h-4 bg-navy/5 rounded w-1/2" />
								<div className="flex gap-2">
									{[1, 2, 3].map((j) => (
										<div key={j} className="h-5 w-14 bg-navy/5 rounded" />
									))}
								</div>
							</div>
						</div>
					))}
				</div>
			</section>
		)
	}

	if (error) {
		return (
			<section>
				<h2 className="text-3xl md:text-4xl font-bold mb-8 text-navy tracking-display">{t.heading}</h2>
				<div className="text-center text-bordeaux">{error}</div>
			</section>
		)
	}

	const filteredProjects = techFilter === 'all'
		? projects
		: projects.filter(p => p.technologies.some(t => t.name === techFilter))

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
		<section>
			<ScrollReveal>
				<h2 className="text-3xl md:text-4xl font-bold mb-6 text-navy tracking-display">{t.heading}</h2>
			</ScrollReveal>

			<ScrollReveal delay={0.1}>
				<div className="flex flex-wrap gap-2 mb-8" aria-label={t.filtersLabel}>
					<button
						onClick={() => setTechFilter('all')}
						className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
							techFilter === 'all'
								? 'bg-bordeaux text-cream'
								: 'bg-navy/5 text-navy/60 hover:bg-navy/10 hover:text-navy'
						}`}
					>
						{t.all} <span className="ml-1 text-xs opacity-60">{projects.length}</span>
					</button>
					{availableTechs.map(tech => (
						<button
							key={tech.name}
							onClick={() => setTechFilter(tech.name)}
							className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
								techFilter === tech.name
									? 'bg-bordeaux text-cream'
									: 'bg-navy/5 text-navy/60 hover:bg-navy/10 hover:text-navy'
							}`}
						>
							{tech.name} <span className="ml-1 text-xs opacity-60">{tech.count}</span>
						</button>
					))}
				</div>
			</ScrollReveal>

			<StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
				{filteredProjects.map((project) => {
					const slug = resolveSlug(project)
					if (!slug) return null
					const publicUrl = sanitizePublicUrl(project.publicUrl)

					return (
						<StaggerItem key={project._id.toString()}>
							<Link
								href={`/${lang}/projects/${slug}`}
								prefetch
								className="group block rounded-xl overflow-hidden border border-navy/5 hover:border-bordeaux/15 bg-white transition-all duration-300 hover:shadow-lg hover:shadow-bordeaux/5"
							>
								<div className="relative aspect-video w-full overflow-hidden">
									<Image
										src={project.thumbnail || '/images/projects/default-project.jpg'}
										alt={`${pickLang(project.title_en || project.title, project.title_es || project.title, project.title)}`}
										fill
										className="object-cover transition-transform duration-500 group-hover:scale-105"
										priority={false}
										placeholder="blur"
										blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nNjQwJyBoZWlnaHQ9JzM2MCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48cmVjdCBmaWxsPSIjZjBlY2U2IiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+"
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-navy/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
									<div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
										<ArrowUpRight className="w-5 h-5 text-cream" />
									</div>
								</div>

								<div className="p-5">
									<h3 className="font-semibold text-navy text-base mb-1 group-hover:text-bordeaux transition-colors line-clamp-1">
										{pickLang(project.title_en || project.title, project.title_es || project.title, project.title)}
									</h3>
									<p className="text-sm text-navy/50 line-clamp-2 mb-4">
										{pickLang(project.subtitle_en || project.subtitle, project.subtitle_es || project.subtitle, project.subtitle)}
									</p>

									{publicUrl && (
										<a
											href={publicUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 text-xs font-medium text-bordeaux hover:text-bordeaux-light mb-3"
											onClick={(e) => e.stopPropagation()}
										>
											<ExternalLink className="w-3 h-3" />
											{lang === 'es' ? 'Ver proyecto' : 'Visit project'}
										</a>
									)}

									<div className="flex flex-wrap gap-1.5">
										{project.technologies.map((tech) => (
											<Badge
												key={tech._id.toString()}
												variant="outline"
												className="bg-navy/3 hover:bg-navy/5 text-navy/60 border-navy/8 text-xs px-2 py-0.5 inline-flex items-center gap-1"
											>
												<SkillIcon name={tech.name} icon={tech.icon} size={12} className="w-3 h-3" />
												<span>{tech.name}</span>
											</Badge>
										))}
									</div>
								</div>
							</Link>
						</StaggerItem>
					)
				})}
			</StaggerContainer>
		</section>
	)
}
