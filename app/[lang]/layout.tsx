import { Inter } from 'next/font/google'
import '../globals.css'
import Script from 'next/script'
import { buildEnglishMetadata, buildSpanishMetadata } from '../metadata'
import ClientLayout from '../client-layout'
import { StructuredData } from '@/components/structured-data'
import { Metadata } from 'next'
import { normalizeCanonicalPath, resolveAlternateBaseUrl, resolveBaseUrl } from '@/lib/seo'

const inter = Inter({ subsets: ['latin'] })

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
    const { lang } = await params
    const resolved = lang === 'es' ? 'es' : 'en'
    const baseUrl = await resolveBaseUrl()
    const alternateBaseUrl = resolveAlternateBaseUrl(baseUrl)
    const isSpanish = resolved === 'es'
    const canonicalPath = normalizeCanonicalPath(resolved === 'es' ? '/es' : '/en')

    const metadataForLang = isSpanish
        ? buildSpanishMetadata(baseUrl, alternateBaseUrl, canonicalPath)
        : buildEnglishMetadata(baseUrl, alternateBaseUrl, canonicalPath)

    const languageAlternates = {
        'en-US': `${baseUrl}${normalizeCanonicalPath('/en')}`,
        'es-AR': `${baseUrl}${normalizeCanonicalPath('/es')}`,
        'es-ES': `${baseUrl}${normalizeCanonicalPath('/es')}`,
        'x-default': `${baseUrl}${normalizeCanonicalPath('/en')}`,
    }

    return {
        ...metadataForLang,
        alternates: {
            ...metadataForLang.alternates,
            canonical: `${baseUrl}${canonicalPath}`,
            languages: languageAlternates,
        },
    }
}

export default async function RootLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const resolved = lang === 'es' ? 'es' : 'en'
    const baseUrl = await resolveBaseUrl()
    const alternateBaseUrl = resolveAlternateBaseUrl(baseUrl)

    return (
        <html lang={resolved} suppressHydrationWarning>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
                <meta name="theme-color" content="#1a2433" />
                <StructuredData
                    lang={resolved}
                    baseUrl={baseUrl}
                    alternateBaseUrl={alternateBaseUrl}
                />

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
