import type { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inakilozano.com'

export const metadata: Metadata = {
    metadataBase: new URL(baseUrl),
    title: {
        default: 'Iñaki F. Lozano | Computation Engineering Student & Software Developer',
        template: '%s | Iñaki F. Lozano'
    },
    description: 'Driven Computation Engineering student focused on technology and innovation. Researching secure document workflows, building scalable backends, and blending DevOps, AI, and full stack development skills.',
    keywords: [
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
        'Iñaki Lozano',
        'Inaki Lozano'
    ],
    authors: [{ name: 'Iñaki F. Lozano', url: baseUrl }],
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: baseUrl,
        title: 'Iñaki F. Lozano | Computation Engineering Student & Software Developer',
        description: 'Computation Engineering student leading secure document initiatives for the Court of Accounts of Tucumán and developing scalable e-commerce backends. Skilled across DevOps, AI, and full stack development.',
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
        description: 'Driven technologist researching secure document signing standards, building scalable APIs, and honing AI and DevOps skills.',
        images: ['/pfp.jpg'],
        creator: '@inakilozano'
    },
    icons: {
        icon: [
            {
                url: '/favicon.ico'
            },
            {
                url: '/favicon-32x32.png',
                sizes: '32x32',
                type: 'image/png'
            },
            {
                url: '/favicon-16x16.png',
                sizes: '16x16',
                type: 'image/png'
            },
            {
                url: '/favicon-48x48.png',
                sizes: '48x48',
                type: 'image/png'
            },
            {
                url: '/favicon-256x256.png',
                sizes: '256x256',
                type: 'image/png'
            }
        ],
        apple: [
            {
                url: '/apple-touch-icon.png',
                sizes: '180x180',
                type: 'image/png'
            }
        ],
        other: [
            {
                rel: 'manifest',
                url: '/site.webmanifest'
            }
        ]
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
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
        canonical: baseUrl,
        languages: {
            'en-US': baseUrl,
            'x-default': baseUrl
        }
    }
} 