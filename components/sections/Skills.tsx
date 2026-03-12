'use client'

import { useEffect, useState, useMemo } from 'react'
import { VscCode } from 'react-icons/vsc'
import LoadingSpinner from '@/components/ui/loading-spinner'
import Image from 'next/image'
import { iconMap, isCustomIconPath, type IconProps } from '@/components/skills/icon-registry'
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/scroll-reveal'

interface Skill {
	_id?: string
	name: string
	category: string
	proficiency: number
	yearsOfExperience: number
	icon: string
}

const copy = {
	en: {
		heading: 'Skills & Technologies',
		descriptionFallback: 'A comprehensive set of technical skills across various domains',
		searchPlaceholder: 'Search skills...',
		sortLabel: 'Sort by',
		sortOptions: {
			proficiency: 'Proficiency',
			years: 'Years',
			name: 'Name',
		},
		sortDirAsc: 'Asc',
		sortDirDesc: 'Desc',
		all: 'All',
		proficiency: 'Proficiency',
		experience: 'Experience',
		years: (n: number) => (n === 1 ? 'year' : 'years'),
	},
	es: {
		heading: 'Habilidades y Tecnologias',
		descriptionFallback: 'Un conjunto integral de habilidades tecnicas en diversos dominios',
		searchPlaceholder: 'Buscar habilidades...',
		sortLabel: 'Ordenar por',
		sortOptions: {
			proficiency: 'Dominio',
			years: 'Anos',
			name: 'Nombre',
		},
		sortDirAsc: 'Asc',
		sortDirDesc: 'Desc',
		all: 'Todas',
		proficiency: 'Dominio',
		experience: 'Experiencia',
		years: (n: number) => (n === 1 ? 'ano' : 'anos'),
	},
} as const

function coerceSkill(raw: any): Skill {
	return {
		_id: raw._id,
		name: String(raw.name || '').trim(),
		category: String(raw.category || '').trim(),
		proficiency: typeof raw.proficiency === 'number' ? raw.proficiency : Number(raw.proficiency) || 0,
		yearsOfExperience: typeof raw.yearsOfExperience === 'number' ? raw.yearsOfExperience : Number(raw.yearsOfExperience) || 0,
		icon: String(raw.icon || '').trim(),
	}
}

export default function Skills({ lang = 'en' }: { lang?: 'en' | 'es' }) {
	const [titleEn, setTitleEn] = useState<string>('')
	const [titleEs, setTitleEs] = useState<string>('')
	const [titleBase, setTitleBase] = useState<string>('')
	const [description, setDescription] = useState<string>('')
	const [description_en, setDescription_en] = useState<string>('')
	const [description_es, setDescription_es] = useState<string>('')
	const [content, setContent] = useState<Skill[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [selectedCategory, setSelectedCategory] = useState<string>('all')
	const [searchQuery, setSearchQuery] = useState('')
	const [sortBy, setSortBy] = useState<'proficiency' | 'years' | 'name'>('proficiency')
	const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

	const t = copy[lang] ?? copy.en
	const heading = lang === 'es'
		? (titleEs || t.heading)
		: (titleEn || titleBase || t.heading)
	const displayDescription =
		lang === 'es'
			? (description_es || t.descriptionFallback)
			: (description_en || description || t.descriptionFallback)

	useEffect(() => {
		const fetchSkills = async () => {
			try {
				const sectionResponse = await fetch('/api/sections/skills')
				if (!sectionResponse.ok) {
					throw new Error('Failed to fetch skills section')
				}
				const sectionData = await sectionResponse.json()

				if (sectionData && sectionData.content) {
					setTitleBase(sectionData.title || sectionData.content.title || '')
					setTitleEn(sectionData.content.title_en || sectionData.content.title || sectionData.title || '')
					setTitleEs(sectionData.content.title_es || sectionData.content.title || sectionData.title || '')
					setDescription(sectionData.content.description || '')
					setDescription_en(sectionData.content.description_en || '')
					setDescription_es(sectionData.content.description_es || '')

					const skillsResponse = await fetch('/api/skills')
					if (!skillsResponse.ok) {
						throw new Error('Failed to fetch skills data')
					}
					const skillsData = await skillsResponse.json()

					if (Array.isArray(skillsData)) {
						const normalizedSkills = skillsData
							.map(coerceSkill)
							.filter(skill => skill.name && skill.category)
						setContent(normalizedSkills)
					} else {
						setError('Invalid skills data format')
					}
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'An error occurred')
			} finally {
				setLoading(false)
			}
		}

		fetchSkills()
	}, [])

	const categories = useMemo(() => {
		const cats = new Map<string, number>()
		content.forEach(skill => {
			const norm = skill.category.charAt(0).toUpperCase() + skill.category.slice(1)
			cats.set(norm, (cats.get(norm) || 0) + 1)
		})
		return Array.from(cats.entries()).sort((a, b) => a[0].localeCompare(b[0]))
	}, [content])

	const filteredSkills = useMemo(() => {
		const dataset = selectedCategory === 'all'
			? content
			: content.filter(skill => {
				const category = skill.category.charAt(0).toUpperCase() + skill.category.slice(1)
				return category === selectedCategory
			})

		const q = searchQuery.trim().toLowerCase()
		const withSearch = q
			? dataset.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
			: dataset

		const sorted = [...withSearch].sort((a, b) => {
			let comparison = 0
			switch (sortBy) {
				case 'proficiency':
					comparison = a.proficiency - b.proficiency
					break
				case 'years':
					comparison = a.yearsOfExperience - b.yearsOfExperience
					break
				case 'name':
					comparison = a.name.localeCompare(b.name)
					break
			}
			return sortDir === 'desc' ? -comparison : comparison
		})

		return sorted
	}, [content, selectedCategory, searchQuery, sortBy, sortDir])

	useEffect(() => {
		setSelectedCategory('all')
	}, [])

	if (loading) return <div className="py-20 flex justify-center"><LoadingSpinner /></div>
	if (error) return <div role="alert" className="text-center text-bordeaux-light">{error}</div>
	if (!content.length) return null

	return (
		<div className="w-full">
			<ScrollReveal>
				<h2 className="text-3xl md:text-4xl font-bold mb-3 text-cream tracking-display">
					{heading}
				</h2>
				{displayDescription && (
					<p className="text-lg text-cream/50 mb-8">{displayDescription}</p>
				)}
			</ScrollReveal>

			<ScrollReveal delay={0.1}>
				<div className="space-y-4 mb-8">
					<div
						className="flex flex-wrap gap-2 items-center"
						role="tablist"
						aria-label={lang === 'es' ? 'Filtrar habilidades por categoria' : 'Filter skills by category'}
					>
						<button
							onClick={() => setSelectedCategory('all')}
							className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
								selectedCategory === 'all'
									? 'bg-bordeaux text-cream'
									: 'bg-cream/10 text-cream/60 hover:bg-cream/15 hover:text-cream/80'
							}`}
							role="tab"
							aria-selected={selectedCategory === 'all'}
						>
							{t.all} <span className="ml-1 text-xs opacity-60">{content.length}</span>
						</button>
						{categories.map(([category, count]) => (
							<button
								key={category}
								onClick={() => setSelectedCategory(category)}
								className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
									selectedCategory === category
										? 'bg-bordeaux text-cream'
										: 'bg-cream/10 text-cream/60 hover:bg-cream/15 hover:text-cream/80'
								}`}
								role="tab"
								aria-selected={selectedCategory === category}
							>
								{category} <span className="ml-1 text-xs opacity-60">{count}</span>
							</button>
						))}
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder={t.searchPlaceholder}
							className="h-9 rounded-lg border border-cream/10 bg-cream/5 px-3 py-1 text-sm text-cream placeholder:text-cream/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-bordeaux/50"
						/>
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value as any)}
							className="h-9 rounded-lg border border-cream/10 bg-cream/5 px-2 py-1 text-sm text-cream focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-bordeaux/50"
							aria-label={t.sortLabel}
						>
							<option value="proficiency">{t.sortOptions.proficiency}</option>
							<option value="years">{t.sortOptions.years}</option>
							<option value="name">{t.sortOptions.name}</option>
						</select>
						<button
							onClick={() => setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'))}
							className="h-9 px-3 rounded-lg border border-cream/10 text-sm text-cream/60 hover:bg-cream/5 hover:text-cream transition-colors"
							aria-label={lang === 'es' ? 'Cambiar direccion de orden' : 'Toggle sort direction'}
						>
							{sortDir === 'desc' ? t.sortDirDesc : t.sortDirAsc}
						</button>
					</div>
				</div>
			</ScrollReveal>

			<StaggerContainer
				className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
				staggerDelay={0.05}
			>
				{filteredSkills.map((skill) => {
					const uniqueKey = skill._id || `${skill.name}-${skill.category}`

					let Icon = VscCode
					if (skill.icon && iconMap[skill.icon as keyof typeof iconMap]) {
						Icon = iconMap[skill.icon as keyof typeof iconMap] as any
					}

					return (
						<StaggerItem
							key={uniqueKey}
							className="bg-cream/5 border border-cream/8 p-5 rounded-xl hover:bg-cream/8 hover:border-cream/12 transition-all duration-300 group"
						>
							<div className="flex items-center gap-3 mb-4">
								{isCustomIconPath(skill.icon) ? (
									<Image
										src={skill.icon.startsWith('http') ? skill.icon : (skill.icon.startsWith('/') ? skill.icon : `/${skill.icon}`)}
										alt={skill.name}
										width={24}
										height={24}
										className="w-6 h-6 object-contain"
									/>
								) : (
									Icon && (
										<Icon
											className="w-6 h-6 text-bordeaux group-hover:text-bordeaux-light transition-colors"
											aria-hidden="true"
										/>
									)
								)}
								<h3 className="font-medium text-cream text-sm">{skill.name}</h3>
							</div>

							<div className="space-y-3">
								<div>
									<div className="flex justify-between text-xs text-cream/40 mb-1.5">
										<span>{t.proficiency}</span>
										<span className="font-mono">{skill.proficiency}%</span>
									</div>
									<div
										className="h-1.5 bg-cream/10 rounded-full overflow-hidden"
										role="progressbar"
										aria-valuenow={skill.proficiency}
										aria-valuemin={0}
										aria-valuemax={100}
										aria-label={`${skill.name} proficiency`}
									>
										<div
											className="h-full bg-gradient-to-r from-bordeaux to-bordeaux-light rounded-full transition-all duration-700"
											style={{ width: `${skill.proficiency}%` }}
										/>
									</div>
								</div>
								<p className="text-xs text-cream/40">
									<span className="font-medium text-cream/50">{t.experience}: </span>
									{skill.yearsOfExperience} {t.years(skill.yearsOfExperience)}
								</p>
							</div>
						</StaggerItem>
					)
				})}
			</StaggerContainer>
		</div>
	)
}
