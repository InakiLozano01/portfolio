import type { Metadata } from 'next'
import { normalizeUrl } from '@/lib/seo'

const fallbackBaseUrl = normalizeUrl(process.env.NEXT_PUBLIC_APP_URL) || 'https://inakilozano.com'
const fallbackAltBaseUrl = normalizeUrl(process.env.NEXT_PUBLIC_ALT_APP_URL) || ''

const accentKeywordVariants = [
    'Iñaki Lozano',
    'iñaki lozano',
    'Iñaki Fernando Lozano',
    'iñaki fernando lozano',
    'Iñaki F. Lozano',
    'iñaki f. lozano',
    'Inaki Lozano',
    'inaki lozano',
    'Inaki Fernando Lozano',
    'inaki fernando lozano'
]

const sharedGeoMeta = {
    'geo.region': 'AR-T',
    'geo.placename': 'Tucumán',
    'geo.position': '-26.8241;-65.2226',
    'ICBM': '-26.8241, -65.2226'
}

const baseLanguageAlternates = (baseUrl: string) => ({
    'en-US': `${baseUrl}/en`,
    'es-AR': `${baseUrl}/es`,
    'es-ES': `${baseUrl}/es`,
    'x-default': `${baseUrl}/en`
})

const buildVerification = () => {
    const other: Record<string, string> = {}
    if (process.env.BING_SITE_VERIFICATION) {
        other['msvalidate.01'] = process.env.BING_SITE_VERIFICATION
    }
    if (process.env.YANDEX_SITE_VERIFICATION) {
        other['yandex-verification'] = process.env.YANDEX_SITE_VERIFICATION
    }

    return {
        ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
        ...(Object.keys(other).length ? { other } : {})
    }
}

const buildCanonicalUrl = (baseUrl: string, canonicalPath?: string) => {
    const normalizedPath = canonicalPath ? (canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`) : ''
    return `${baseUrl}${normalizedPath}`
}

export const buildEnglishMetadata = (
    baseUrl: string = fallbackBaseUrl,
    alternateBaseUrl: string = fallbackAltBaseUrl,
    canonicalPath?: string
): Metadata => {
    const canonicalUrl = buildCanonicalUrl(baseUrl, canonicalPath)

    const keywords = [
        'Software Engineer SSr',
        'Computer Engineering UNT',
        'Secure document workflows',
        'Advanced electronic signatures',
        'DevOps',
        'CI/CD',
        'Docker',
        'Python',
        'Flask',
        'Java',
        'Spring',
        'SQL',
        'JavaScript',
        'TypeScript',
        'React',
        'GCP',
        'PHP',
        'CodeIgniter',
        'Backend Development',
        'API Development',
        'Database Design',
        'Scalable architectures',
        'Software Developer Argentina',
        'Software Engineer Tucumán',
        'Developer NOA',
        ...accentKeywordVariants
    ]

    return {
        metadataBase: new URL(baseUrl),
        title: {
            default: 'Iñaki F. Lozano | Software Engineer SSr · Computer Engineering, UNT',
            template: '%s'
        },
        description:
            'Software Engineer SSr at the Court of Accounts of Tucumán. Completing Computer Engineering at UNT and building secure document workflows, scalable backends, and practical systems.',
        keywords,
        authors: [{ name: 'Iñaki Fernando Lozano', url: baseUrl }],
        openGraph: {
            type: 'website',
            locale: 'en_US',
            alternateLocale: ['es_AR'],
            url: canonicalUrl,
            title: 'Iñaki F. Lozano | Software Engineer SSr · Computer Engineering, UNT',
            description:
                'Software Engineer SSr at the Court of Accounts of Tucumán. Completing Computer Engineering at UNT and building secure document workflows and scalable backends.',
            siteName: 'Iñaki F. Lozano Portfolio',
            images: [
                {
                    url: '/og-en.png',
                    width: 1200,
                    height: 630,
                    alt: 'Iñaki F. Lozano - Software Engineer SSr · Computer Engineering, UNT',
                    type: 'image/png'
                }
            ]
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Iñaki F. Lozano | Software Engineer SSr · Computer Engineering, UNT',
            description:
                'Software Engineer SSr building secure document workflows, scalable APIs, and DevOps automation.',
            images: ['/og-en.png'],
            creator: '@inakilozano',
            site: '@inakilozano'
        },
        icons: {
            icon: [
                { url: '/favicon.ico' },
                { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
                { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
                { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
                { url: '/favicon-256x256.png', sizes: '256x256', type: 'image/png' }
            ],
            apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
            other: [{ rel: 'manifest', url: '/site.webmanifest' }]
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1
            }
        },
        verification: buildVerification(),
        category: 'technology',
        alternates: {
            canonical: canonicalUrl,
            languages: baseLanguageAlternates(baseUrl)
        },
        other: {
            ...sharedGeoMeta,
            'alternate.site': alternateBaseUrl
        }
    }
}

// Spanish metadata for the /es route
export const buildSpanishMetadata = (
    baseUrl: string = fallbackBaseUrl,
    alternateBaseUrl: string = fallbackAltBaseUrl,
    canonicalPath: string = '/es'
): Metadata => {
    const canonicalUrl = buildCanonicalUrl(baseUrl, canonicalPath)

    const keywords = [
        'Ingeniero de Software SSr',
        'Ingeniería en Computación UNT',
        'Flujos de trabajo de documentos seguros',
        'Firmas electrónicas avanzadas',
        'DevOps',
        'CI/CD',
        'Docker',
        'Python',
        'Flask',
        'Java',
        'Spring',
        'SQL',
        'JavaScript',
        'TypeScript',
        'React',
        'GCP',
        'PHP',
        'CodeIgniter',
        'Desarrollo Backend',
        'Desarrollo de APIs',
        'Diseño de Bases de Datos',
        'Arquitecturas escalables',
        'Desarrollador Tucumán',
        'Desarrollador Argentina',
        'Ingeniero en Computación Tucumán',
        'Tech Tucumán',
        'Tecnología Argentina',
        'Developer NOA',
        'Desarrollador NOA Argentina',
        'Programador Tucumán',
        'Software Tucumán',
        ...accentKeywordVariants
    ]

    return {
        metadataBase: new URL(baseUrl),
        title: {
            default: 'Iñaki F. Lozano | Ingeniero de Software SSr · Ingeniería en Computación, UNT',
            template: '%s'
        },
        description:
            'Ingeniero de Software SSr en el Tribunal de Cuentas de Tucumán. Finaliza Ingeniería en Computación en la UNT y construye flujos seguros de documentos, backends escalables y sistemas prácticos.',
        keywords,
        authors: [{ name: 'Iñaki Fernando Lozano', url: baseUrl }],
        openGraph: {
            type: 'website',
            locale: 'es_AR',
            alternateLocale: ['en_US'],
            url: canonicalUrl,
            title: 'Iñaki F. Lozano | Ingeniero de Software SSr · Ingeniería en Computación, UNT',
            description:
                'Ingeniero de Software SSr en el Tribunal de Cuentas de Tucumán. Finaliza Ingeniería en Computación en la UNT y construye flujos seguros de documentos y backends escalables.',
            siteName: 'Iñaki F. Lozano Portfolio',
            images: [
                {
                    url: '/og-es.png',
                    width: 1200,
                    height: 630,
                    alt: 'Iñaki F. Lozano - Ingeniero de Software SSr · Ingeniería en Computación, UNT',
                    type: 'image/png'
                }
            ]
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Iñaki F. Lozano | Ingeniero de Software SSr · Ingeniería en Computación, UNT',
            description:
                'Ingeniero de Software SSr que construye flujos seguros de documentos, APIs escalables y automatización DevOps.',
            images: ['/og-es.png'],
            creator: '@inakilozano',
            site: '@inakilozano'
        },
        icons: {
            icon: [
                { url: '/favicon.ico' },
                { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
                { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
                { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
                { url: '/favicon-256x256.png', sizes: '256x256', type: 'image/png' }
            ],
            apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
            other: [{ rel: 'manifest', url: '/site.webmanifest' }]
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1
            }
        },
        verification: buildVerification(),
        category: 'technology',
        alternates: {
            canonical: canonicalUrl,
            languages: baseLanguageAlternates(baseUrl)
        },
        other: {
            ...sharedGeoMeta,
            'alternate.site': alternateBaseUrl
        }
    }
}

export const metadata: Metadata = buildEnglishMetadata(fallbackBaseUrl, fallbackAltBaseUrl)
export const metadataES: Metadata = buildSpanishMetadata(fallbackBaseUrl, fallbackAltBaseUrl, '/es')
