import type { Metadata } from 'next'

const normalizeBaseUrl = (url: string) => url.replace(/\/$/, '')

const fallbackBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL || 'https://inakilozano.com')
const fallbackAltBaseUrl =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_ALT_APP_URL || '') ||
    (fallbackBaseUrl.includes('dev') ? 'https://inakilozano.com' : 'https://inakilozano.dev')

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
        'Computation Engineering student',
        'Software Developer',
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
            default: 'Iñaki F. Lozano | Computation Engineering Student & Software Developer',
            template: '%s | Iñaki F. Lozano'
        },
        description:
            'Driven Computation Engineering student focused on technology and innovation. Researching secure document workflows, building scalable backends, and blending DevOps, AI, and full stack development skills.',
        keywords,
        authors: [{ name: 'Iñaki F. Lozano', url: baseUrl }],
        openGraph: {
            type: 'website',
            locale: 'en_US',
            alternateLocale: ['es_AR'],
            url: canonicalUrl,
            title: 'Iñaki F. Lozano | Computation Engineering Student & Software Developer',
            description:
                'Computation Engineering student leading secure document initiatives for the Court of Accounts of Tucumán and developing scalable e-commerce backends. Skilled across DevOps, AI, and full stack development.',
            siteName: 'Iñaki F. Lozano Portfolio',
            images: [
                {
                    url: '/pfp.jpg',
                    width: 1200,
                    height: 630,
                    alt: 'Iñaki F. Lozano - Computation Engineering Student & Software Developer',
                    type: 'image/jpeg'
                }
            ]
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Iñaki F. Lozano | Computation Engineering Student & Software Developer',
            description:
                'Driven technologist researching secure document signing standards, building scalable APIs, and honing AI and DevOps skills.',
            images: ['/pfp.jpg'],
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
        verification: {
            google: process.env.GOOGLE_SITE_VERIFICATION || 'your-google-site-verification',
            other: {
                'msvalidate.01': process.env.BING_SITE_VERIFICATION || '',
                'yandex-verification': process.env.YANDEX_SITE_VERIFICATION || ''
            }
        },
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
        'Estudiante de Ingeniería en Computación',
        'Desarrollador de Software',
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
            default: 'Iñaki F. Lozano | Estudiante de Ingeniería en Computación y Desarrollador de Software',
            template: '%s | Iñaki F. Lozano'
        },
        description:
            'Estudiante de Ingeniería en Computación enfocado en tecnología e innovación. Investigando flujos de trabajo de documentos seguros, construyendo backends escalables, y combinando habilidades de DevOps, IA y desarrollo full stack.',
        keywords,
        authors: [{ name: 'Iñaki F. Lozano', url: baseUrl }],
        openGraph: {
            type: 'website',
            locale: 'es_AR',
            alternateLocale: ['en_US'],
            url: canonicalUrl,
            title: 'Iñaki F. Lozano | Estudiante de Ingeniería en Computación y Desarrollador de Software',
            description:
                'Estudiante de Ingeniería en Computación liderando iniciativas de documentos seguros para el Tribunal de Cuentas de Tucumán y desarrollando backends escalables de e-commerce. Experiencia en DevOps, IA y desarrollo full stack.',
            siteName: 'Iñaki F. Lozano Portfolio',
            images: [
                {
                    url: '/pfp.jpg',
                    width: 1200,
                    height: 630,
                    alt: 'Iñaki F. Lozano - Estudiante de Ingeniería en Computación y Desarrollador de Software',
                    type: 'image/jpeg'
                }
            ]
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Iñaki F. Lozano | Estudiante de Ingeniería en Computación y Desarrollador de Software',
            description:
                'Tecnólogo impulsado investigando estándares de firma de documentos seguros, construyendo APIs escalables y perfeccionando habilidades de IA y DevOps.',
            images: ['/pfp.jpg'],
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
        verification: {
            google: process.env.GOOGLE_SITE_VERIFICATION || 'your-google-site-verification',
            other: {
                'msvalidate.01': process.env.BING_SITE_VERIFICATION || '',
                'yandex-verification': process.env.YANDEX_SITE_VERIFICATION || ''
            }
        },
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
