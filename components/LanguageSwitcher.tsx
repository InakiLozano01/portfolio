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
        // segments[0] is empty, segments[1] is lang (e.g. 'en' or 'es')
        // If we are at root /en, segments is ['', 'en']
        if (segments.length > 1) {
            segments[1] = newLang
            const newPath = segments.join('/')
            router.push(newPath)
        }
    }

    return (
        <div className="flex items-center gap-2 ml-4">
            <button
                onClick={() => switchLanguage('en')}
                className={`text-sm font-medium transition-colors ${lang === 'en'
                        ? 'text-[#FF5456]'
                        : 'text-gray-400 hover:text-white'
                    }`}
                aria-label="Switch to English"
            >
                EN
            </button>
            <span className="text-gray-600">/</span>
            <button
                onClick={() => switchLanguage('es')}
                className={`text-sm font-medium transition-colors ${lang === 'es'
                        ? 'text-[#FF5456]'
                        : 'text-gray-400 hover:text-white'
                    }`}
                aria-label="Cambiar a Español"
            >
                ES
            </button>
        </div>
    )
}
