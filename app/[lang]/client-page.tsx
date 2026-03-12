'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ReactElement } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface Section {
	id: string
	label: string
	component: () => ReactElement | null
}

interface DBSection {
	_id: string
	title: string
	order: number
	visible: boolean
	content: Record<string, any>
}

const sectionComponents: Record<string, () => Promise<any>> = {
	home: () => import('@/components/sections/Home'),
	about: () => import('@/components/sections/About'),
	education: () => import('@/components/sections/Education'),
	experience: () => import('@/components/sections/Experience'),
	skills: () => import('@/components/sections/Skills'),
	projects: () => import('@/components/sections/Projects'),
	blog: () => import('@/components/sections/Blog'),
	contact: () => import('@/components/sections/Contact'),
}

const sectionBg: Record<string, string> = {
	home: 'bg-navy',
	about: 'bg-cream',
	education: 'bg-cream-dark',
	experience: 'bg-cream',
	skills: 'bg-navy',
	projects: 'bg-cream',
	blog: 'bg-cream-dark',
	contact: 'bg-navy',
}

interface ClientPageProps {
	lang: 'en' | 'es'
	dictionary: any
}

export default function ClientPage({ lang, dictionary }: ClientPageProps) {
	const [activeSection, setActiveSection] = useState('')
	const [sections, setSections] = useState<Section[]>([])
	const [loading, setLoading] = useState(true)
	const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())
	const observerRef = useRef<IntersectionObserver | null>(null)

	useEffect(() => {
		const fetchSections = async () => {
			try {
				const response = await fetch('/api/sections')
				if (!response.ok) {
					throw new Error('Failed to fetch sections')
				}
				const data: DBSection[] = await response.json()

				const uiSections = await Promise.all(
					data
						.filter(section => section.visible)
						.sort((a, b) => a.order - b.order)
						.map(async section => {
							const id = section.title.toLowerCase()
							const importComponent = sectionComponents[id]

							if (!importComponent) return null

							try {
								const module = await importComponent()
								const label = dictionary.sections[id] || section.title

								return {
									id,
									label,
									component: module.default,
								}
							} catch (error) {
								console.error(`Failed to load component for section ${id}:`, error)
								return null
							}
						}),
				)

				const filtered = uiSections.filter((section): section is Section => section !== null)
				setSections(filtered)
				setLoading(false)

				if (filtered.length > 0) {
					setActiveSection(filtered[0].id)
				}
			} catch (error) {
				console.error('Error fetching sections:', error)
				setLoading(false)
			}
		}

		fetchSections()
	}, [dictionary])

	const setupObserver = useCallback(() => {
		if (observerRef.current) {
			observerRef.current.disconnect()
		}

		observerRef.current = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter(entry => entry.isIntersecting)
					.sort((a, b) => {
						const rectA = a.boundingClientRect
						const rectB = b.boundingClientRect
						return Math.abs(rectA.top) - Math.abs(rectB.top)
					})

				if (visible.length > 0) {
					const id = visible[0].target.id
					setActiveSection(id)
					const newHash = id === 'home' ? '' : `#${id}`
					if (window.location.hash !== newHash) {
						window.history.replaceState(null, '', newHash || `/${lang}`)
					}
				}
			},
			{
				rootMargin: '-20% 0px -60% 0px',
				threshold: 0,
			},
		)

		sectionRefs.current.forEach((el) => {
			observerRef.current?.observe(el)
		})

		return () => {
			observerRef.current?.disconnect()
		}
	}, [lang])

	useEffect(() => {
		if (sections.length === 0) return
		const cleanup = setupObserver()
		return cleanup
	}, [sections, setupObserver])

	useEffect(() => {
		if (sections.length === 0) return
		const hash = window.location.hash.slice(1)
		if (hash) {
			const el = document.getElementById(hash)
			if (el) {
				setTimeout(() => {
					el.scrollIntoView({ behavior: 'smooth' })
				}, 100)
			}
		}
	}, [sections])

	const handleSectionChange = useCallback((sectionId: string) => {
		const el = document.getElementById(sectionId)
		if (el) {
			el.scrollIntoView({ behavior: 'smooth' })
		}
	}, [])

	const registerRef = useCallback((id: string, el: HTMLElement | null) => {
		if (el) {
			sectionRefs.current.set(id, el)
		} else {
			sectionRefs.current.delete(id)
		}
	}, [])

	if (loading) {
		return (
			<div className="min-h-screen bg-navy flex items-center justify-center">
				<div className="w-8 h-8 border-2 border-cream/20 border-t-bordeaux rounded-full animate-spin" />
			</div>
		)
	}

	return (
		<div className="min-h-screen">
			<Header
				staticSections={sections}
				activeSection={activeSection}
				onSectionChange={handleSectionChange}
				dictionary={dictionary.header}
				lang={lang}
			/>

			<div className="noise-overlay" aria-hidden="true" />

			{sections.map(({ id, component: Component }) => {
				const bg = sectionBg[id] || 'bg-cream'
				const isDark = id === 'home' || id === 'skills' || id === 'contact'

				return (
					<section
						key={id}
						id={id}
						ref={(el) => registerRef(id, el)}
						className={`${bg} ${isDark ? 'text-cream' : 'text-navy'} relative`}
					>
						<div className={`${id === 'home' ? '' : 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28'}`}>
							{/* @ts-ignore */}
							<Component lang={lang} />
						</div>
					</section>
				)
			})}

			<Footer dictionary={dictionary.footer} />
		</div>
	)
}
