import { headers } from 'next/headers'

const FALLBACK_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://inakilozano.com'
const FALLBACK_ALT_URL = process.env.NEXT_PUBLIC_ALT_APP_URL

const normalizeUrl = (url: string | null | undefined) => {
    if (!url) return null
    const trimmed = url.trim()
    if (!trimmed) return null
    const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
    try {
        const parsed = new URL(withProtocol)
        parsed.pathname = ''
        parsed.search = ''
        parsed.hash = ''
        return parsed.toString().replace(/\/$/, '')
    } catch (_error) {
        return null
    }
}

export async function resolveBaseUrl(): Promise<string> {
    const hdrs = await headers()
    const proto = hdrs.get('x-forwarded-proto') || hdrs.get('x-forwarded-scheme') || 'https'
    const host = hdrs.get('x-forwarded-host') || hdrs.get('host')

    if (host) {
        const candidate = normalizeUrl(`${proto}://${host}`)
        if (candidate) return candidate
    }

    return normalizeUrl(FALLBACK_BASE_URL) || 'https://inakilozano.com'
}

export function resolveAlternateBaseUrl(currentBase?: string) {
    const normalizedCurrent = normalizeUrl(currentBase) || normalizeUrl(FALLBACK_BASE_URL)

    const fromEnv = normalizeUrl(FALLBACK_ALT_URL)
    if (fromEnv) return fromEnv

    if (normalizedCurrent?.includes('inakilozano.com')) return 'https://inakilozano.dev'
    if (normalizedCurrent?.includes('inakilozano.dev')) return 'https://inakilozano.com'

    return normalizedCurrent || 'https://inakilozano.com'
}

export function normalizeCanonicalPath(path?: string) {
    if (!path) return ''
    return path.startsWith('/') ? path : `/${path}`
}

export function selectHostsForLanguage(lang: string, baseUrl?: string, alternateBaseUrl?: string) {
    const normalizedLang = lang === 'es' ? 'es' : 'en'
    const primary = normalizeUrl(baseUrl) || normalizeUrl(FALLBACK_BASE_URL) || 'https://inakilozano.com'
    const secondary = normalizeUrl(alternateBaseUrl) || normalizeUrl(FALLBACK_ALT_URL)

    const spanishHost = (primary?.includes('inakilozano.com') ? primary : secondary) || primary
    const englishHost = (primary?.includes('inakilozano.dev') ? primary : secondary) || secondary || primary
    const canonicalHost = normalizedLang === 'es' ? spanishHost : englishHost
    const backupHost = canonicalHost === primary ? secondary : primary

    return { canonicalHost, secondaryHost: backupHost, englishHost, spanishHost }
}

export function buildLanguageAlternateUrls(
    englishHost: string,
    spanishHost: string,
    englishPath: string,
    spanishPath: string
) {
    const normalizedEnglishHost = normalizeUrl(englishHost) || englishHost
    const normalizedSpanishHost = normalizeUrl(spanishHost) || spanishHost
    const enPath = normalizeCanonicalPath(englishPath)
    const esPath = normalizeCanonicalPath(spanishPath)

    return {
        'en-US': `${normalizedEnglishHost}${enPath}`,
        'es-AR': `${normalizedSpanishHost}${esPath}`,
        'es-ES': `${normalizedSpanishHost}${esPath}`,
        'x-default': `${normalizedEnglishHost}${enPath}`
    }
}

export function buildMetaDescription(rawValue?: string | null, fallback: string = '', maxLength = 160) {
    const source = rawValue || fallback || ''
    const stripped = source.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (!stripped) return ''
    if (stripped.length <= maxLength) return stripped
    return `${stripped.slice(0, maxLength - 3).trim()}...`
}
