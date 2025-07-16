import type { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inakiserver.lat'

export const metadata: Metadata = {
    metadataBase: new URL(baseUrl),
    title: {
        default: 'Iñaki F. Lozano | Full Stack Developer & Software Engineer',
        template: '%s | Iñaki F. Lozano'
    },
    description: 'Experienced Full Stack Developer specializing in React, Next.js, Node.js, TypeScript, and MongoDB. Creating modern, scalable web applications with exceptional user experiences. Available for freelance projects and collaborations.',
    keywords: [
        'Full Stack Developer',
        'Software Engineer',
        'Web Development',
        'React Developer',
        'Next.js Developer',
        'TypeScript Developer',
        'Node.js Developer',
        'MongoDB Developer',
        'Frontend Developer',
        'Backend Developer',
        'JavaScript Developer',
        'Freelance Developer',
        'Web Applications',
        'Software Development',
        'Modern Web Technologies',
        'Responsive Design',
        'API Development',
        'Database Design',
        'Iñaki Lozano',
        'Inaki Lozano'
    ],
    authors: [{ name: 'Iñaki F. Lozano', url: baseUrl }],
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: baseUrl,
        title: 'Iñaki F. Lozano | Full Stack Developer & Software Engineer',
        description: 'Experienced Full Stack Developer specializing in React, Next.js, Node.js, TypeScript, and MongoDB. Creating modern, scalable web applications with exceptional user experiences.',
        siteName: 'Iñaki F. Lozano Portfolio',
        images: [
            {
                url: '/pfp.jpg',
                width: 1200,
                height: 630,
                alt: 'Iñaki F. Lozano - Full Stack Developer & Software Engineer',
                type: 'image/jpeg'
            }
        ]
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Iñaki F. Lozano | Full Stack Developer & Software Engineer',
        description: 'Experienced Full Stack Developer specializing in React, Next.js, Node.js, TypeScript, and MongoDB.',
        images: ['/pfp.jpg'],
        creator: '@inakilozano'
    },
    icons: {
        icon: [
            {
                url: '/favicon-32x32.png',
                sizes: '32x32',
                type: 'image/png'
            },
            {
                url: '/favicon-16x16.png',
                sizes: '16x16',
                type: 'image/png'
            }
        ],
        apple: {
            url: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
        },
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