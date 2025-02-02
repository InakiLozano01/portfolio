import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'
import { metadata } from './metadata'
import ClientLayout from './client-layout'

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
        <link rel="canonical" href="https://inakiserver.lat" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Script
          strategy="lazyOnload"
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
        />
        <Script strategy="lazyOnload" id="ga-script">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
          `}
        </Script>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}

