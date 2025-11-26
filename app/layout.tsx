import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'
import { metadata } from './metadata'
import ClientLayout from './client-layout'
import { StructuredData } from '@/components/structured-data'

const inter = Inter({ subsets: ['latin'] })

export { metadata }

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
        <link rel="canonical" href="https://inakilozano.com" />
        <StructuredData />

        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
          `}
        </Script>
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ClientLayout>
          {/* Main content landmark for accessibility and skip link target */}
          <main id="content">{children}</main>
        </ClientLayout>
      </body>
    </html>
  )
}

