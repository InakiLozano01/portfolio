'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'
import LanguageSwitcher from './LanguageSwitcher'
import { motion, AnimatePresence } from 'framer-motion'

interface StaticSection {
	id: string
	label: string
	component: () => React.ReactElement | null
}

interface HeaderProps {
	staticSections?: StaticSection[]
	activeSection?: string
	currentIndex?: number
	onSectionChange?: (value: any) => void
	dictionary?: any
	lang?: string
}

export default function Header({
	staticSections = [],
	activeSection = '',
	currentIndex,
	onSectionChange = () => {},
	dictionary = {},
	lang = 'en',
}: HeaderProps) {
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const [isScrolled, setIsScrolled] = useState(false)
	const menuRef = useRef<HTMLDivElement | null>(null)

	const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
		e.preventDefault()
		if (typeof onSectionChange === 'function') {
			const sectionIndex = staticSections.findIndex(s => s.id === sectionId)
			if (typeof currentIndex === 'number') {
				onSectionChange(sectionIndex)
			} else {
				onSectionChange(sectionId)
			}
		}
		setIsMenuOpen(false)
	}

	const isSectionActive = (sectionId: string) => {
		if (activeSection) {
			return activeSection === sectionId
		}
		if (typeof currentIndex === 'number') {
			const idx = staticSections.findIndex(s => s.id === sectionId)
			return idx === currentIndex
		}
		return false
	}

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20)
		}
		window.addEventListener('scroll', handleScroll, { passive: true })
		handleScroll()
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth >= 768) {
				setIsMenuOpen(false)
			}
		}
		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setIsMenuOpen(false)
		}
		document.addEventListener('keydown', onKeyDown)
		if (isMenuOpen) {
			document.body.classList.add('overflow-hidden')
		} else {
			document.body.classList.remove('overflow-hidden')
		}
		return () => {
			document.removeEventListener('keydown', onKeyDown)
			document.body.classList.remove('overflow-hidden')
		}
	}, [isMenuOpen])

	useEffect(() => {
		if (!isMenuOpen || !menuRef.current) return
		const menuEl = menuRef.current
		const focusFirst = () => {
			const first = menuEl.querySelector<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])')
			first?.focus()
		}
		focusFirst()
		const handler = (e: KeyboardEvent) => {
			if (e.key !== 'Tab') return
			const focusables = menuEl.querySelectorAll<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])')
			if (!focusables.length) return
			const first = focusables[0]
			const last = focusables[focusables.length - 1]
			const active = document.activeElement as HTMLElement | null
			if (e.shiftKey) {
				if (active === first) {
					e.preventDefault()
					last.focus()
				}
			} else {
				if (active === last) {
					e.preventDefault()
					first.focus()
				}
			}
		}
		document.addEventListener('keydown', handler, true)
		return () => document.removeEventListener('keydown', handler, true)
	}, [isMenuOpen])

	if (!staticSections || staticSections.length === 0) {
		return null
	}

	return (
		<header
			className={`sticky top-0 z-50 transition-all duration-300 ${
				isScrolled
					? 'bg-navy/95 backdrop-blur-md shadow-lg shadow-navy/10'
					: 'bg-navy'
			}`}
		>
			<a
				href="#content"
				className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:bg-cream focus:text-navy focus:px-3 focus:py-1 focus:rounded focus:z-50"
			>
				{dictionary.skipToContent || 'Skip to content'}
			</a>

			<nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="h-[56px] md:h-[72px] flex justify-between items-center">
					<Link
						href={`/${lang}`}
						className="text-cream font-semibold text-lg tracking-tight flex items-center gap-2.5 hover:text-cream/80 transition-colors"
						aria-label={dictionary.home || 'Home'}
					>
						<Image
							src="/inakilozanodotcomlogo.png"
							alt="Logo"
							width={28}
							height={28}
							className="rounded-sm"
						/>
						<span className="hidden sm:inline">Inaki F. Lozano</span>
					</Link>

					<div className="flex items-center gap-6">
						<div
							className="hidden md:flex items-center gap-1"
							aria-label={dictionary.mainNavigation || 'Main navigation'}
						>
							{staticSections.map((section) => {
								const isActive = isSectionActive(section.id)
								return (
									<a
										key={section.id}
										href={section.id === 'home' ? `/${lang}` : `/${lang}#${section.id}`}
										onClick={(e) => handleNavClick(e, section.id)}
										className={`relative px-3 py-2 text-sm font-medium transition-colors rounded-md ${
											isActive
												? 'text-cream'
												: 'text-cream/60 hover:text-cream/90'
										}`}
										aria-current={isActive ? 'page' : undefined}
									>
										{section.label}
										{isActive && (
											<motion.span
												layoutId="nav-active"
												className="absolute inset-x-1 -bottom-0.5 h-0.5 bg-bordeaux rounded-full"
												transition={{ type: 'spring', stiffness: 400, damping: 30 }}
											/>
										)}
									</a>
								)
							})}
						</div>

						<div className="hidden md:block">
							<LanguageSwitcher lang={lang} />
						</div>

						<button
							className="md:hidden text-cream hover:text-cream/80 transition-colors p-1"
							onClick={() => setIsMenuOpen(!isMenuOpen)}
							aria-label={isMenuOpen ? (dictionary.closeMenu || 'Close menu') : (dictionary.openMenu || 'Open menu')}
							aria-expanded={isMenuOpen}
							aria-controls="mobile-menu"
						>
							{isMenuOpen ? <X size={22} /> : <Menu size={22} />}
						</button>
					</div>
				</div>
			</nav>

			<AnimatePresence>
				{isMenuOpen && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="fixed inset-0 bg-navy/60 backdrop-blur-sm md:hidden z-40"
							onClick={() => setIsMenuOpen(false)}
							aria-hidden="true"
						/>

						<motion.nav
							ref={menuRef}
							id="mobile-menu"
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{ duration: 0.2 }}
							className="absolute top-[56px] left-0 right-0 bg-navy border-t border-cream/10 p-6 md:hidden z-50 shadow-xl"
							aria-label={dictionary.mobileNavigation || 'Mobile navigation'}
						>
							<div className="space-y-1">
								{staticSections.map((section, index) => {
									const isActive = isSectionActive(section.id)
									return (
										<motion.div
											key={section.id}
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: index * 0.05 }}
										>
											<a
												href={section.id === 'home' ? `/${lang}` : `/${lang}#${section.id}`}
												onClick={(e) => handleNavClick(e, section.id)}
												className={`block py-3 px-4 rounded-lg text-base font-medium transition-colors ${
													isActive
														? 'text-cream bg-bordeaux/20'
														: 'text-cream/70 hover:text-cream hover:bg-cream/5'
												}`}
												aria-current={isActive ? 'page' : undefined}
											>
												{section.label}
											</a>
										</motion.div>
									)
								})}
							</div>
							<div className="mt-6 pt-6 border-t border-cream/10">
								<LanguageSwitcher lang={lang} />
							</div>
						</motion.nav>
					</>
				)}
			</AnimatePresence>
		</header>
	)
}
