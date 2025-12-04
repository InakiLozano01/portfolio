import { Inter } from 'next/font/google'
import './globals.css'
import { metadata as baseMetadata } from './metadata'
import { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

// Export the base metadata for the root layout
export const metadata: Metadata = baseMetadata

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
            </head>
            <body className={inter.className} suppressHydrationWarning>
                {children}
            </body>
        </html>
    )
}
