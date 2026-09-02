import type { Metadata } from 'next'
import Link from 'next/link'
import { buildLanguageAlternateUrls, resolveBaseUrl } from '@/lib/seo'

type LegalPageProps = {
    params: Promise<{ lang: string }>
}

const content = {
    en: {
        eyebrow: 'Legal information',
        title: 'Website ownership',
        statement: 'The legal name of the person and business represented by this website is Iñaki Fernando Lozano.',
        detail: 'inakilozano.com is the official professional website of Iñaki Fernando Lozano, based in Tucumán, Argentina.',
        ethos: 'Ethos is the principal independent product project developed and operated by Iñaki Fernando Lozano.',
        ethosLink: 'Visit Ethos',
        labels: {
            legalName: 'Legal name',
            website: 'Website',
            location: 'Location',
            email: 'Contact email',
        },
        location: 'San Miguel de Tucumán, Tucumán, Argentina',
        back: 'Back to portfolio',
        switchLanguage: 'Español',
    },
    es: {
        eyebrow: 'Información legal',
        title: 'Titularidad del sitio web',
        statement: 'El nombre legal de la persona y del negocio representado por este sitio web es Iñaki Fernando Lozano.',
        detail: 'inakilozano.com es el sitio web profesional oficial de Iñaki Fernando Lozano, con sede en Tucumán, Argentina.',
        ethos: 'Ethos es el principal proyecto de producto independiente desarrollado y operado por Iñaki Fernando Lozano.',
        ethosLink: 'Visitar Ethos',
        labels: {
            legalName: 'Nombre legal',
            website: 'Sitio web',
            location: 'Ubicación',
            email: 'Correo de contacto',
        },
        location: 'San Miguel de Tucumán, Tucumán, Argentina',
        back: 'Volver al portafolio',
        switchLanguage: 'English',
    },
} as const

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
    const { lang } = await params
    const resolved = lang === 'es' ? 'es' : 'en'
    const baseUrl = await resolveBaseUrl()
    const canonical = `${baseUrl}/${resolved}/legal`

    return {
        title: resolved === 'es'
            ? 'Información legal | Iñaki Fernando Lozano'
            : 'Legal information | Iñaki Fernando Lozano',
        description: resolved === 'es'
            ? 'Información legal y titularidad de inakilozano.com.'
            : 'Legal information and ownership of inakilozano.com.',
        alternates: {
            canonical,
            languages: buildLanguageAlternateUrls(baseUrl, baseUrl, '/en/legal', '/es/legal'),
        },
        robots: {
            index: true,
            follow: true,
        },
    }
}

export default async function LegalPage({ params }: LegalPageProps) {
    const { lang } = await params
    const resolved = lang === 'es' ? 'es' : 'en'
    const copy = content[resolved]
    const alternateLang = resolved === 'es' ? 'en' : 'es'

    const details = [
        [copy.labels.legalName, 'Iñaki Fernando Lozano'],
        [copy.labels.website, 'https://inakilozano.com'],
        [copy.labels.location, copy.location],
        [copy.labels.email, 'inakilozano01@gmail.com'],
    ]

    return (
        <main className="min-h-screen bg-[#f7f7f5] text-[#1a2433]">
            <header className="border-b border-[#1a2433]/10 bg-white">
                <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
                    <Link
                        href={`/${resolved}`}
                        className="font-semibold tracking-tight transition-colors hover:text-[#FD4345] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD4345] focus-visible:ring-offset-4"
                    >
                        Iñaki Fernando Lozano
                    </Link>
                    <Link
                        href={`/${alternateLang}/legal`}
                        hrefLang={alternateLang}
                        className="text-sm font-medium text-[#1a2433]/65 transition-colors hover:text-[#1a2433] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD4345] focus-visible:ring-offset-4"
                    >
                        {copy.switchLanguage}
                    </Link>
                </div>
            </header>

            <article className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#FD4345]">
                    {copy.eyebrow}
                </p>
                <h1 className="max-w-2xl text-4xl font-bold tracking-[-0.035em] sm:text-5xl">
                    {copy.title}
                </h1>
                <p className="mt-8 max-w-2xl text-xl font-medium leading-8 sm:text-2xl sm:leading-9">
                    {copy.statement}
                </p>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[#1a2433]/70">
                    {copy.detail}
                </p>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[#1a2433]/70">
                    {copy.ethos}{' '}
                    <a
                        href="https://ethos.ar"
                        className="font-medium text-[#1a2433] underline decoration-[#FD4345] decoration-2 underline-offset-4 transition-colors hover:text-[#FD4345] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD4345] focus-visible:ring-offset-4"
                    >
                        {copy.ethosLink}
                    </a>
                </p>

                <dl className="mt-12 divide-y divide-[#1a2433]/10 border-y border-[#1a2433]/10">
                    {details.map(([label, value]) => (
                        <div key={label} className="grid gap-1 py-5 sm:grid-cols-[10rem_1fr] sm:gap-6">
                            <dt className="text-sm font-medium text-[#1a2433]/60">{label}</dt>
                            <dd className="break-words font-medium">{value}</dd>
                        </div>
                    ))}
                </dl>

                <Link
                    href={`/${resolved}`}
                    className="mt-10 inline-flex min-h-11 items-center border-b-2 border-[#FD4345] font-semibold transition-colors hover:text-[#FD4345] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD4345] focus-visible:ring-offset-4"
                >
                    ← {copy.back}
                </Link>
            </article>
        </main>
    )
}
