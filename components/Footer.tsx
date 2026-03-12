'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FaLinkedin, FaGithub, FaEnvelope } from 'react-icons/fa'
import type { ContactContent } from '@/models/Section'

interface FooterProps {
	dictionary?: any
}

export default function Footer({ dictionary = {} }: FooterProps) {
	const [contactData, setContactData] = useState<ContactContent>({
		email: 'inakilozano01@gmail.com',
		city: 'San Miguel de Tucuman, Argentina',
		social: {
			github: 'https://github.com/InakiLozano01',
			linkedin: 'https://www.linkedin.com/in/inaki-lozano',
		},
	})
	const currentYear = new Date().getFullYear()

	useEffect(() => {
		const fetchContactData = async () => {
			try {
				const response = await fetch('/api/sections/contact')
				if (!response.ok) throw new Error('Failed to fetch contact data')
				const data = await response.json()
				if (data.content) {
					setContactData(data.content)
				}
			} catch (error) {
				console.error('Error fetching contact data:', error)
			}
		}

		fetchContactData()
	}, [])

	const copyrightText = dictionary.copyright
		? dictionary.copyright.replace('{year}', currentYear)
		: `\u00A9 ${currentYear} Inaki Fernando Lozano`

	return (
		<footer className="bg-navy text-cream/80 border-t border-cream/5">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
				<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
					<div>
						<p className="text-cream font-semibold text-lg tracking-tight mb-2">
							Inaki F. Lozano
						</p>
						<p className="text-cream/50 text-sm max-w-xs">
							{dictionary.tagline || 'Full-stack developer crafting modern web experiences'}
						</p>
					</div>

					<div className="flex items-center gap-5">
						{contactData.social.linkedin && (
							<Link
								href={contactData.social.linkedin}
								target="_blank"
								rel="noopener noreferrer"
								className="text-cream/50 hover:text-bordeaux transition-colors duration-200"
								aria-label={dictionary.linkedin || 'LinkedIn'}
							>
								<FaLinkedin size={20} />
							</Link>
						)}
						{contactData.social.github && (
							<Link
								href={contactData.social.github}
								target="_blank"
								rel="noopener noreferrer"
								className="text-cream/50 hover:text-bordeaux transition-colors duration-200"
								aria-label={dictionary.github || 'GitHub'}
							>
								<FaGithub size={20} />
							</Link>
						)}
						{contactData.email && (
							<Link
								href={`mailto:${contactData.email}`}
								className="text-cream/50 hover:text-bordeaux transition-colors duration-200"
								aria-label={dictionary.email || 'Email'}
							>
								<FaEnvelope size={20} />
							</Link>
						)}
					</div>
				</div>

				<div className="mt-10 pt-8 border-t border-cream/5">
					<p className="text-sm text-cream/30">{copyrightText}</p>
				</div>
			</div>
		</footer>
	)
}
