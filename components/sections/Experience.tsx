'use client'

import React, { useState, useEffect } from 'react'
import { FaBriefcase } from 'react-icons/fa'
import LoadingSpinner from '@/components/ui/loading-spinner'
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/scroll-reveal'

interface Experience {
	title: string
	title_es?: string
	company: string
	period: string
	description?: string
	description_es?: string
	responsibilities: string[]
	responsibilities_es?: string[]
}

interface ExperienceContent {
	experiences: Experience[]
}

interface ExperienceProps {
	lang?: 'en' | 'es'
}

export default function Experience({ lang = 'en' }: ExperienceProps) {
	const [content, setContent] = useState<ExperienceContent | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const fetchContent = async () => {
			try {
				const response = await fetch('/api/sections/experience')
				if (!response.ok) {
					throw new Error('Failed to fetch experience information')
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
	if (!content?.experiences) return null

	const title = lang === 'en' ? 'Experience' : 'Experiencia'
	const keyResponsibilities = lang === 'en' ? 'Key responsibilities' : 'Responsabilidades clave'

	return (
		<div className="w-full">
			<ScrollReveal>
				<h2 className="text-3xl md:text-4xl font-bold mb-12 text-navy tracking-display">
					{title}
				</h2>
			</ScrollReveal>

			<StaggerContainer className="relative">
				<div
					className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-navy/10 md:-translate-x-px"
					aria-hidden="true"
				/>

				{content.experiences.map((exp, index) => {
					const jobTitle = (lang === 'en' ? exp.title : exp.title_es) || exp.title
					const description = (lang === 'en' ? exp.description : exp.description_es) || exp.description
					const responsibilities = (lang === 'en' ? exp.responsibilities : exp.responsibilities_es) || exp.responsibilities
					const isLeft = index % 2 === 0

					return (
						<StaggerItem key={index} className="relative mb-12 last:mb-0">
							<div className={`flex items-start gap-0 md:gap-8 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
								<div className={`hidden md:block md:w-[calc(50%-2rem)] ${isLeft ? 'text-right' : 'text-left'}`}>
									<div className={`inline-block ${isLeft ? 'ml-auto' : 'mr-auto'}`}>
										<span className="text-sm font-medium text-navy/40">
											{exp.period}
										</span>
									</div>
								</div>

								<div className="absolute left-6 md:left-1/2 -translate-x-1/2 z-10 flex items-center justify-center">
									<div className="w-12 h-12 rounded-full bg-cream border-2 border-bordeaux/30 flex items-center justify-center shadow-sm">
										<FaBriefcase className="w-4 h-4 text-bordeaux" aria-hidden="true" />
									</div>
								</div>

								<div className={`ml-16 md:ml-0 md:w-[calc(50%-2rem)]`}>
									<div className="bg-white rounded-xl p-6 border border-navy/5 hover:border-bordeaux/10 transition-colors duration-300">
										<span className="text-sm font-medium text-navy/40 md:hidden block mb-2">
											{exp.period}
										</span>

										<h3 className="text-lg font-semibold text-navy mb-1">
											{jobTitle}
										</h3>
										<p className="text-base text-bordeaux/80 mb-3">{exp.company}</p>

										{description && (
											<p className="text-navy/60 text-sm mb-4">{description}</p>
										)}

										{responsibilities && responsibilities.length > 0 && (
											<div>
												<h4 className="text-xs font-semibold uppercase tracking-wider text-navy/40 mb-2">
													{keyResponsibilities}
												</h4>
												<ul className="space-y-1.5" role="list">
													{responsibilities.map((responsibility: string, i: number) => (
														<li key={i} className="flex items-start gap-2 text-sm text-navy/60">
															<span
																className="mt-1.5 h-1 w-1 rounded-full bg-bordeaux/50 flex-shrink-0"
																aria-hidden="true"
															/>
															<span>{responsibility}</span>
														</li>
													))}
												</ul>
											</div>
										)}
									</div>
								</div>
							</div>
						</StaggerItem>
					)
				})}
			</StaggerContainer>
		</div>
	)
}
