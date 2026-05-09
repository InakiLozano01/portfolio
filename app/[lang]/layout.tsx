import Script from 'next/script'
import { buildEnglishMetadata, buildSpanishMetadata } from '../metadata'
import DocumentLanguage from './document-language'
import { StructuredData } from '@/components/structured-data'
import { Metadata } from 'next'
import { normalizeCanonicalPath, resolveAlternateBaseUrl, resolveBaseUrl } from '@/lib/seo'

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
    const gaId = process.env.NEXT_PUBLIC_GA_ID

    return (
        <>
            <DocumentLanguage lang={resolved} />
            <StructuredData
                lang={resolved}
                baseUrl={baseUrl}
                alternateBaseUrl={alternateBaseUrl}
            />

            {gaId ? (
                <>
                <Script
                    src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
                    strategy="afterInteractive"
                />
                <Script id="google-analytics" strategy="afterInteractive">
                    {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');
          `}
                </Script>
                </>
            ) : null}

            {children}
        </>
    )
}
