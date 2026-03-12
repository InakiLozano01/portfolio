'use client'

import React, { useState, useEffect } from 'react'
import { FaGraduationCap } from 'react-icons/fa'
import LoadingSpinner from '@/components/ui/loading-spinner'
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/scroll-reveal'

interface Education {
	institution: string
	degree: string
	degree_es?: string
	period: string
	description: string
	description_es?: string
}

interface EducationContent {
	education: Education[]
}

interface EducationProps {
	lang?: 'en' | 'es'
}

export default function Education({ lang = 'en' }: EducationProps) {
	const [content, setContent] = useState<EducationContent | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const fetchContent = async () => {
			try {
				const response = await fetch('/api/sections/education')
				if (!response.ok) {
					throw new Error('Failed to fetch education information')
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
	if (!content?.education) return null

	const title = lang === 'en' ? 'Education' : 'Educacion'

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

				{content.education.map((edu, index) => {
					const degree = (lang === 'en' ? edu.degree : edu.degree_es) || edu.degree
					const description = (lang === 'en' ? edu.description : edu.description_es) || edu.description
					const isLeft = index % 2 === 0

					return (
						<StaggerItem key={index} className="relative mb-12 last:mb-0">
							<div className={`flex items-start gap-0 md:gap-8 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
								<div className={`hidden md:block md:w-[calc(50%-2rem)] ${isLeft ? 'text-right' : 'text-left'}`}>
									<div className={`inline-block ${isLeft ? 'ml-auto' : 'mr-auto'}`}>
										<span className="text-sm font-medium text-navy/40">
											{edu.period}
										</span>
									</div>
								</div>

								<div className="absolute left-6 md:left-1/2 -translate-x-1/2 z-10 flex items-center justify-center">
									<div className="w-12 h-12 rounded-full bg-cream-dark border-2 border-bordeaux/30 flex items-center justify-center shadow-sm">
										<FaGraduationCap className="w-4 h-4 text-bordeaux" aria-hidden="true" />
									</div>
								</div>

								<div className={`ml-16 md:ml-0 md:w-[calc(50%-2rem)]`}>
									<div className="bg-white rounded-xl p-6 border border-navy/5 hover:border-bordeaux/10 transition-colors duration-300">
										<span className="text-sm font-medium text-navy/40 md:hidden block mb-2">
											{edu.period}
										</span>

										<h3 className="text-lg font-semibold text-navy mb-1">
											{degree}
										</h3>
										<p className="text-base text-bordeaux/80 mb-3">{edu.institution}</p>

										{description && (
											<p className="text-navy/60 text-sm">{description}</p>
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
