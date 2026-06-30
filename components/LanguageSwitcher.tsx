import Link from 'next/link'

interface LanguageSwitcherProps {
    lang: string
    dict?: any
}

export default function LanguageSwitcher({ lang, dict = {} }: LanguageSwitcherProps) {
    return (
        <div className="flex items-center gap-2 ml-4">
            <Link
                href="/en"
                prefetch={false}
                className={`text-sm font-medium transition-colors ${lang === 'en'
                        ? 'text-[#FF5456]'
                        : 'text-gray-400 hover:text-white'
                    }`}
                aria-label={dict?.switchToEnglish || 'Switch to English'}
            >
                EN
            </Link>
            <span className="text-gray-600">/</span>
            <Link
                href="/es"
                prefetch={false}
                className={`text-sm font-medium transition-colors ${lang === 'es'
                        ? 'text-[#FF5456]'
                        : 'text-gray-400 hover:text-white'
                    }`}
                aria-label={dict?.switchToSpanish || 'Switch to Spanish'}
            >
                ES
            </Link>
        </div>
    )
}
