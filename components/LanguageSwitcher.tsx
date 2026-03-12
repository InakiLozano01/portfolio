'use client'

import { usePathname, useRouter } from 'next/navigation'

interface LanguageSwitcherProps {
	lang: string
}

export default function LanguageSwitcher({ lang }: LanguageSwitcherProps) {
	const pathname = usePathname()
	const router = useRouter()

	const switchLanguage = (newLang: string) => {
		if (!pathname) return
		const segments = pathname.split('/')
		if (segments.length > 1) {
			segments[1] = newLang
			const newPath = segments.join('/')
			router.push(newPath)
		}
	}

	return (
		<div className="flex items-center gap-2">
			<button
				onClick={() => switchLanguage('en')}
				className={`text-sm font-medium transition-colors ${
					lang === 'en'
						? 'text-cream'
						: 'text-cream/40 hover:text-cream/70'
				}`}
				aria-label="Switch to English"
			>
				EN
			</button>
			<span className="text-cream/20">/</span>
			<button
				onClick={() => switchLanguage('es')}
				className={`text-sm font-medium transition-colors ${
					lang === 'es'
						? 'text-cream'
						: 'text-cream/40 hover:text-cream/70'
				}`}
				aria-label="Cambiar a Espanol"
			>
				ES
			</button>
		</div>
	)
}
