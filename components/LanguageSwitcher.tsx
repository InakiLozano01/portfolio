import Link from 'next/link'

interface LanguageSwitcherProps {
    lang: string
}

export default function LanguageSwitcher({ lang }: LanguageSwitcherProps) {
    return (
        <div className="flex items-center gap-2 ml-4">
            <Link
                href="/en"
                prefetch={false}
                className={`text-sm font-medium transition-colors ${lang === 'en'
                        ? 'text-[#FF5456]'
                        : 'text-gray-400 hover:text-white'
                    }`}
                aria-label="Switch to English"
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
                aria-label="Cambiar a Español"
            >
                ES
            </Link>
        </div>
    )
}
