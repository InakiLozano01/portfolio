import type { MetadataRoute } from 'next'

const normalizeBaseUrl = (value: string | undefined) => {
  const fallback = 'https://inakilozano.com'
  const raw = (value || fallback).trim()
  const withProtocol = raw.startsWith('http') ? raw : `https://${raw}`
  try {
    const url = new URL(withProtocol)
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return fallback
  }
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL)

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
