'use client'

import Link from 'next/link'

interface LanguageSwitcherProps {
    lang: string
    dict?: any
}

export default function LanguageSwitcher({ lang, dict = {} }: LanguageSwitcherProps) {
    function switchLanguage(event: React.MouseEvent<HTMLAnchorElement>, target: 'en' | 'es') {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        const url = new URL(window.location.href)
        const segments = url.pathname.split('/')
        if (segments[1] === 'en' || segments[1] === 'es') {
            segments[1] = target
            url.pathname = segments.join('/')
        } else {
            url.pathname = `/${target}`
        }
        window.location.assign(url.pathname + url.search + url.hash)
    }
    return (
        <div className="flex items-center gap-2 ml-4">
            <Link
                href="/en"
                prefetch={false}
                onClick={event => switchLanguage(event, 'en')}
                className={`text-sm font-medium transition-colors ${lang === 'en'
                        ? 'text-cream underline decoration-[#FF5456] underline-offset-4'
                        : 'text-cream/80 hover:text-cream'
                    }`}
                aria-label={dict?.switchToEnglish || 'Switch to English'}
            >
                EN
            </Link>
            <span className="text-cream/70" aria-hidden="true">/</span>
            <Link
                href="/es"
                prefetch={false}
                onClick={event => switchLanguage(event, 'es')}
                className={`text-sm font-medium transition-colors ${lang === 'es'
                        ? 'text-cream underline decoration-[#FF5456] underline-offset-4'
                        : 'text-cream/80 hover:text-cream'
                    }`}
                aria-label={dict?.switchToSpanish || 'Switch to Spanish'}
            >
                ES
            </Link>
        </div>
    )
}
