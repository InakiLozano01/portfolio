'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import type { AboutContent } from '@/models/Section'
import LoadingSpinner from '@/components/ui/loading-spinner'
import ScrollReveal from '@/components/scroll-reveal'

interface AboutProps {
	lang?: 'en' | 'es'
}

export default function About({ lang = 'en' }: AboutProps) {
	const [content, setContent] = useState<AboutContent | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const fetchContent = async () => {
			try {
				const response = await fetch('/api/sections/about')
				if (!response.ok) {
					throw new Error('Failed to fetch about information')
				}
				const data = await response.json()
				setContent(data.content)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'An error occurred')
			} finally {
				setLoading(false)
			}
		}

		fetchContent()
	}, [])

	if (loading) return <LoadingSpinner />
	if (error) return <div role="alert" className="text-center text-bordeaux">{error}</div>
	if (!content) return null

	const description = (lang === 'en' ? content.description_en : content.description_es) || content.description
	const highlights = (lang === 'en' ? content.highlights_en : content.highlights_es) || content.highlights

	const labels = {
		aboutMe: lang === 'en' ? 'About me' : 'Sobre mi',
		hobbies: lang === 'en' ? 'Hobbies & interests' : 'Hobbies e intereses',
		downloadCV: lang === 'en' ? 'Download CV' : 'Descargar CV',
		viewCV: lang === 'en' ? 'View CV' : 'Ver CV',
	}

	return (
		<div className="w-full">
			<ScrollReveal>
				<h2 className="text-3xl md:text-4xl font-bold mb-12 text-navy tracking-display">
					{labels.aboutMe}
				</h2>
			</ScrollReveal>

			<div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-start">
				<ScrollReveal className="md:col-span-4" delay={0.1}>
					<div className="relative">
						<div className="relative w-full aspect-[3/4] max-w-[280px] mx-auto md:mx-0">
							<Image
								src="/pfp.jpg"
								alt="Inaki Lozano's profile picture"
								fill
								sizes="(max-width: 768px) 280px, 300px"
								priority
								placeholder="blur"
								blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMzAwJyBoZWlnaHQ9JzQwMCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48cmVjdCBmaWxsPSIjZjBlY2U2IiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+"
								className="object-cover rounded-xl"
							/>
						</div>
						<div
							className="absolute -bottom-3 -right-3 w-full h-full rounded-xl border-2 border-bordeaux/20 -z-10"
							aria-hidden="true"
						/>
					</div>
				</ScrollReveal>

				<ScrollReveal className="md:col-span-8" delay={0.2}>
					<p className="text-navy/70 leading-relaxed text-base md:text-lg mb-8">
						{description}
					</p>

					<h3 className="text-lg font-semibold mb-4 text-navy">
						{labels.hobbies}
					</h3>
					<ul
						className="space-y-2 mb-8"
						aria-label={labels.hobbies}
					>
						{highlights.map((highlight: string, index: number) => (
							<li key={index} className="flex items-start gap-3 text-navy/70">
								<span
									className="mt-2 h-1.5 w-1.5 rounded-full bg-bordeaux flex-shrink-0"
									aria-hidden="true"
								/>
								<span>{highlight}</span>
							</li>
						))}
					</ul>

					<div className="flex flex-wrap gap-3">
						<a
							href="/CV.pdf"
							download
							className="inline-flex items-center gap-2 bg-bordeaux hover:bg-bordeaux-light text-cream px-5 py-2.5 rounded-lg font-medium text-sm transition-colors duration-200"
							aria-label={`${labels.downloadCV} (PDF)`}
						>
							{labels.downloadCV}
						</a>
						<a
							href="/CV.pdf"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 border border-navy/20 hover:border-navy/40 text-navy px-5 py-2.5 rounded-lg font-medium text-sm transition-colors duration-200"
						>
							{labels.viewCV}
						</a>
					</div>
				</ScrollReveal>
			</div>
		</div>
	)
}
