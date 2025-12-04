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
    const spanishHost = (baseUrl.includes('inakilozano.com') ? baseUrl : alternateBaseUrl) || baseUrl
    const englishHost = (baseUrl.includes('inakilozano.dev') ? baseUrl : alternateBaseUrl) || alternateBaseUrl || baseUrl
    const canonicalHostForLang = isSpanish ? spanishHost : englishHost
    const secondaryHost = canonicalHostForLang === baseUrl ? alternateBaseUrl : baseUrl

    const metadataForLang = isSpanish
        ? buildSpanishMetadata(canonicalHostForLang, secondaryHost, canonicalPath)
        : buildEnglishMetadata(canonicalHostForLang, secondaryHost, canonicalPath)

    const languageAlternates = {
        'en-US': `${englishHost}${normalizeCanonicalPath('/en')}`,
        'es-AR': `${spanishHost}${normalizeCanonicalPath('/es')}`,
        'es-ES': `${spanishHost}${normalizeCanonicalPath('/es')}`,
        'x-default': `${englishHost}${normalizeCanonicalPath('/en')}`,
    }

    return {
        ...metadataForLang,
        alternates: {
            ...metadataForLang.alternates,
            canonical: `${canonicalHostForLang}${canonicalPath}`,
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
    const spanishHost = (baseUrl.includes('inakilozano.com') ? baseUrl : alternateBaseUrl) || baseUrl
    const englishHost = (baseUrl.includes('inakilozano.dev') ? baseUrl : alternateBaseUrl) || alternateBaseUrl || baseUrl
    const canonicalHostForLang = resolved === 'es' ? spanishHost : englishHost
    const secondaryHost = canonicalHostForLang === baseUrl ? alternateBaseUrl : baseUrl

    return (
        <html lang={resolved} suppressHydrationWarning>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
                <meta name="theme-color" content="#1a2433" />
                <StructuredData
                    lang={resolved}
                    baseUrl={canonicalHostForLang}
                    alternateBaseUrl={secondaryHost}
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
