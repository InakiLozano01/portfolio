// Resolve the public-facing base URL for server-side redirects (behind the
// Cloudflare → nginx → app chain, req.url is the internal loopback origin).
const FALLBACK_BASE_URL = 'https://inakilozano.com'
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

const sanitizeBaseUrl = (input: string | undefined | null): string | null => {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    if (LOCAL_HOSTNAMES.has(url.hostname)) return null
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

export function resolvePublicBaseUrl(req: Request): string {
  for (const candidate of [sanitizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL), sanitizeBaseUrl(process.env.NEXTAUTH_URL)]) {
    if (candidate) return candidate
  }
  try {
    const origin = new URL(req.url).origin
    if (!LOCAL_HOSTNAMES.has(new URL(origin).hostname)) return origin
  } catch {
    // fall through
  }
  return FALLBACK_BASE_URL
}

export function publicUrl(req: Request, path: string): string {
  const base = resolvePublicBaseUrl(req)
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function localeFromCookie(req: Request): 'en' | 'es' {
  const m = req.headers.get('cookie')?.match(/(?:^|;\s*)NEXT_LOCALE=(en|es)/)
  return m?.[1] === 'es' ? 'es' : 'en'
}
