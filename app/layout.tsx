import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://inakiserver.lat'),
  title: 'Iñaki F. Lozano | Full Stack Developer',
  description: 'Full Stack Developer specializing in modern web technologies. Passionate about creating efficient, scalable, and user-friendly applications.',
  keywords: 'Full Stack Developer, Web Development, React, Node.js, TypeScript, Next.js, MongoDB',
  authors: [{ name: 'Iñaki F. Lozano' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://inakiserver.lat',
    title: 'Iñaki F. Lozano | Full Stack Developer',
    description: 'Full Stack Developer specializing in modern web technologies. Passionate about creating efficient, scalable, and user-friendly applications.',
    siteName: 'Iñaki F. Lozano Portfolio',
    images: [
      {
        url: '/pfp.jpg',
        width: 1200,
        height: 630,
        alt: 'Iñaki F. Lozano - Full Stack Developer'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Iñaki F. Lozano | Full Stack Developer',
    description: 'Full Stack Developer specializing in modern web technologies.',
    images: ['/pfp.jpg']
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
    google: 'your-google-site-verification',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#1a2433" />
        <link rel="canonical" href="https://inakiserver.lat" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Script id="schema-org" type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "Person",
              "name": "Iñaki F. Lozano",
              "url": "https://inakiserver.lat",
              "jobTitle": "Full Stack Developer",
              "description": "Full Stack Developer specializing in modern web technologies.",
              "sameAs": [
                "https://github.com/InakiLozano01",
                "https://linkedin.com/in/inaki-fernando-lozano-b783021b0"
              ]
            }
          `}
        </Script>
        <Providers>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}

