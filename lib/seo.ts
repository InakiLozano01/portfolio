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
