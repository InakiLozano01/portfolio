'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { type Blog } from '@/models/BlogClient'
import { formatDistanceToNow } from 'date-fns'
import { es as esLocale } from 'date-fns/locale'
import { formatDate } from '@/lib/utils'
import NewsletterSignup from '@/components/NewsletterSignup'
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/scroll-reveal'
import { ArrowUpRight } from 'lucide-react'

const copy = {
	en: {
		heading: 'Blog',
		descriptionFallback: 'Stories, updates, and research notes.',
		searchPlaceholder: 'Search blogs...',
		error: 'Error',
		comingSoonTitle: 'Coming soon',
		comingSoonCopy: 'Preparing some exciting content. Stay tuned.',
		noResults: 'No blogs found matching your search.',
		created: 'Created',
		languages: 'EN / ES',
	},
	es: {
		heading: 'Blog',
		descriptionFallback: 'Historias, novedades y notas de investigacion.',
		searchPlaceholder: 'Buscar blogs...',
		error: 'Error',
		comingSoonTitle: 'Proximamente',
		comingSoonCopy: 'Estamos preparando contenido increible. Mantente atento.',
		noResults: 'No se encontraron blogs que coincidan con tu busqueda.',
		created: 'Creado',
		languages: 'EN / ES',
	},
} as const

export default function BlogSection({ lang = 'en' }: { lang?: 'en' | 'es' }) {
	const t = copy[lang] ?? copy.en
	const [blogs, setBlogs] = useState<Blog[]>([])
	const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>([])
	const [searchQuery, setSearchQuery] = useState('')
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [sectionTitleBase, setSectionTitleBase] = useState('')
	const [sectionTitleEn, setSectionTitleEn] = useState('')
	const [sectionTitleEs, setSectionTitleEs] = useState('')
	const [sectionDescription, setSectionDescription] = useState('')
	const [sectionDescriptionEn, setSectionDescriptionEn] = useState('')
	const [sectionDescriptionEs, setSectionDescriptionEs] = useState('')
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		async function fetchBlogs() {
			try {
				const [sectionResponse, response] = await Promise.all([
					fetch('/api/sections/blog'),
					fetch('/api/blogs'),
				])

				if (sectionResponse.ok) {
					const sectionData = await sectionResponse.json()
					if (sectionData && sectionData.content) {
						setSectionTitleBase(sectionData.title || sectionData.content.title || '')
						setSectionTitleEn(sectionData.content.title_en || sectionData.content.title || sectionData.title || '')
						setSectionTitleEs(sectionData.content.title_es || sectionData.content.title || sectionData.title || '')
						setSectionDescription(sectionData.content.description || '')
						setSectionDescriptionEn(sectionData.content.description_en || '')
						setSectionDescriptionEs(sectionData.content.description_es || '')
					}
				}

				if (!response.ok) {
					throw new Error('Failed to fetch blogs')
				}
				const data = await response.json()
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
					}))
				setBlogs(publishedBlogs)
				setFilteredBlogs(publishedBlogs)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'An error occurred')
			} finally {
				setLoading(false)
			}
		}

		fetchBlogs()
	}, [])

	useEffect(() => {
		const query = searchQuery.trim().toLowerCase()
		const filtered = blogs.filter((blog) => {
			if (!query) return true
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
				.map((value) => value.toLowerCase())

			return haystack.some((value) => value.includes(query))
		})
		setFilteredBlogs(filtered)
	}, [searchQuery, blogs])

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
				<mark key={i} className="bg-bordeaux/20 text-navy rounded px-0.5">{part}</mark>
			) : (
				<span key={i}>{part}</span>
			),
		)
	}

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
			<div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
					{[1, 2, 3].map((i) => (
						<div key={i} className="animate-pulse rounded-xl border border-navy/5 p-6">
							<div className="h-5 bg-navy/5 rounded w-3/4 mb-3" />
							<div className="h-4 bg-navy/5 rounded w-1/2 mb-4" />
							<div className="flex gap-2">
								{[1, 2].map((j) => (
									<div key={j} className="h-5 w-14 bg-navy/5 rounded" />
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="text-center text-bordeaux">
				{t.error}: {error}
			</div>
		)
	}

	if (blogs.length === 0) {
		return (
			<div className="text-center py-12">
				<h3 className="text-2xl font-bold mb-3 text-navy">{t.comingSoonTitle}</h3>
				<p className="text-navy/50">{t.comingSoonCopy}</p>
			</div>
		)
	}

	return (
		<div>
			<ScrollReveal>
				<h2 className="text-3xl md:text-4xl font-bold text-navy tracking-display">{heading}</h2>
				{sectionCopy && <p className="text-navy/50 mt-2 mb-6">{sectionCopy}</p>}
			</ScrollReveal>

			<ScrollReveal delay={0.1}>
				<div className="flex flex-col sm:flex-row gap-4 mb-8">
					<input
						type="text"
						placeholder={t.searchPlaceholder}
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="h-10 rounded-lg border border-navy/10 bg-white px-4 text-sm text-navy placeholder:text-navy/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-bordeaux/30 max-w-md"
					/>
				</div>

				<div className="mb-8 max-w-xl">
					<NewsletterSignup className="bg-white border border-navy/5 rounded-xl" lang={lang} />
				</div>
			</ScrollReveal>

			{filteredBlogs.length === 0 ? (
				<div className="text-center text-navy/40 py-8">
					{t.noResults}
				</div>
			) : (
				<StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
							<StaggerItem key={blog._id}>
								<Link href={href} prefetch={true} className="group block">
									<div className="rounded-xl border border-navy/5 bg-white p-6 hover:border-bordeaux/15 hover:shadow-lg hover:shadow-bordeaux/5 transition-all duration-300">
										<div className="flex items-start justify-between gap-3 mb-3">
											<h3 className="font-semibold text-navy text-lg group-hover:text-bordeaux transition-colors line-clamp-2">
												{highlight(title)}
											</h3>
											<ArrowUpRight className="w-4 h-4 text-navy/20 group-hover:text-bordeaux flex-shrink-0 mt-1 transition-colors" />
										</div>

										<p className="text-sm text-navy/50 line-clamp-2 mb-4">
											{highlight(subtitle)}
										</p>

										<div className="flex flex-wrap gap-1.5 mb-4">
											{(() => {
												const { visible, hidden } = getTagDisplay(blog.tags)
												return (
													<>
														{visible.map((tag) => (
															<button
																key={tag}
																className="px-2 py-0.5 bg-bordeaux/5 text-bordeaux/70 rounded text-xs hover:bg-bordeaux/10 transition-colors"
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
															<span className="px-2 py-0.5 bg-navy/3 text-navy/40 rounded text-xs">
																+{hidden.length}
															</span>
														)}
													</>
												)
											})()}
										</div>

										<div className="flex items-center gap-2 text-xs text-navy/30">
											{createdLabel ? (
												<span suppressHydrationWarning>{createdLabel}</span>
											) : null}
											<span className="uppercase tracking-wider bg-navy/5 text-navy/40 px-1.5 py-0.5 rounded text-[10px]">
												{t.languages}
											</span>
										</div>
									</div>
								</Link>
							</StaggerItem>
						)
					})}
				</StaggerContainer>
			)}
		</div>
	)
}
