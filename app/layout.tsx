import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Iñaki F. Lozano | Full Stack Developer',
  description: 'Full Stack Developer specializing in modern web technologies. Passionate about creating efficient, scalable, and user-friendly applications.',
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
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

