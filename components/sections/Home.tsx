'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { HomeContent } from '@/models/Section'
import TextWithEmoji from '@/components/ui/TextWithEmoji'
import { ChevronDown } from 'lucide-react'

interface HomePageProps {
	lang?: 'en' | 'es'
}

export default function HomePage({ lang = 'en' }: HomePageProps) {
	const [content, setContent] = useState<HomeContent | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const reduceMotion = useReducedMotion()

	useEffect(() => {
		const fetchContent = async () => {
			try {
				const response = await fetch('/api/sections/home')
				if (!response.ok) {
					throw new Error('Failed to fetch home content')
				}

				const data = await response.json()
				if (!data || !data.content) {
					throw new Error('Invalid section data')
				}

				setContent(data.content)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to fetch content')
				console.error('Error fetching home content:', err)
			} finally {
				setLoading(false)
			}
		}

		fetchContent()
	}, [])

	if (loading) {
		return (
			<div className="min-h-[100dvh] flex items-center justify-center" role="status" aria-live="polite">
				<div className="w-8 h-8 border-2 border-cream/20 border-t-bordeaux rounded-full animate-spin" />
			</div>
		)
	}

	if (error) return <div className="min-h-[100dvh] flex items-center justify-center text-bordeaux-light">{error}</div>
	if (!content) return null

	const headline = (lang === 'en' ? content.headline_en : content.headline_es) || content.headline
	const description = (lang === 'en' ? content.description_en : content.description_es) || content.description

	const handleScrollDown = () => {
		const nextSection = document.getElementById('about')
		if (nextSection) {
			nextSection.scrollIntoView({ behavior: 'smooth' })
		}
	}

	return (
		<div className="min-h-[100dvh] flex flex-col items-center justify-center relative px-4 sm:px-6 lg:px-8 overflow-hidden">
			<div
				className="absolute inset-0 pointer-events-none"
				aria-hidden="true"
			>
				<div className="absolute top-1/4 -right-32 w-[500px] h-[500px] rounded-full bg-bordeaux/8 blur-[120px]" />
				<div className="absolute bottom-1/3 -left-24 w-[400px] h-[400px] rounded-full bg-bordeaux/5 blur-[100px]" />
				<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cream/5 to-transparent" />
			</div>

			<div className="max-w-3xl mx-auto text-center relative z-10">
				<motion.h1
					className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-cream tracking-display leading-[1.1] mb-6"
					initial={reduceMotion ? false : { opacity: 0, y: 30 }}
					animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
					transition={reduceMotion ? { duration: 0 } : { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
				>
					<TextWithEmoji text={headline} />
				</motion.h1>

				<motion.p
					className="text-lg sm:text-xl text-cream/60 leading-relaxed max-w-2xl mx-auto mb-10"
					initial={reduceMotion ? false : { opacity: 0, y: 20 }}
					animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
					transition={reduceMotion ? { duration: 0 } : { duration: 0.7, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
				>
					<TextWithEmoji text={description} />
				</motion.p>

				<motion.div
					initial={reduceMotion ? false : { opacity: 0 }}
					animate={reduceMotion ? undefined : { opacity: 1 }}
					transition={reduceMotion ? { duration: 0 } : { duration: 0.5, delay: 0.4 }}
					className="flex items-center justify-center gap-4"
				>
					<a
						href="#contact"
						onClick={(e) => {
							e.preventDefault()
							document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
						}}
						className="inline-flex items-center gap-2 bg-bordeaux hover:bg-bordeaux-light text-cream px-6 py-3 rounded-lg font-medium text-sm transition-colors duration-200"
					>
						{lang === 'en' ? 'Get in touch' : 'Contactame'}
					</a>
					<a
						href="#projects"
						onClick={(e) => {
							e.preventDefault()
							document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })
						}}
						className="inline-flex items-center gap-2 border border-cream/20 hover:border-cream/40 text-cream/80 hover:text-cream px-6 py-3 rounded-lg font-medium text-sm transition-colors duration-200"
					>
						{lang === 'en' ? 'View work' : 'Ver proyectos'}
					</a>
				</motion.div>
			</div>

			<motion.button
				onClick={handleScrollDown}
				className="absolute bottom-8 left-1/2 -translate-x-1/2 text-cream/30 hover:text-cream/60 transition-colors"
				initial={reduceMotion ? false : { opacity: 0 }}
				animate={reduceMotion ? undefined : { opacity: 1, y: [0, 6, 0] }}
				transition={
					reduceMotion
						? { duration: 0 }
						: {
							opacity: { duration: 0.5, delay: 0.8 },
							y: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
						}
				}
				aria-label={lang === 'en' ? 'Scroll down' : 'Desplazar hacia abajo'}
			>
				<ChevronDown size={28} />
			</motion.button>
		</div>
	)
}
