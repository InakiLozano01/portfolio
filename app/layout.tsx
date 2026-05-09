import { Inter } from 'next/font/google'
import './globals.css'
import { metadata as baseMetadata } from './metadata'
import type { Metadata, Viewport } from 'next'

const inter = Inter({ subsets: ['latin'] })

// Export the base metadata for the root layout
export const metadata: Metadata = baseMetadata
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    themeColor: '#1a2433',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                {children}
            </body>
        </html>
    )
}
