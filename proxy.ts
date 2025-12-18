import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const locales = ['en', 'es'] as const
const defaultLocale = 'en'

function getForwardedHost(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  return forwardedHost.split(',')[0]?.trim() || ''
}

function getForwardedProto(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-proto') ||
    request.headers.get('x-forwarded-scheme') ||
    request.nextUrl.protocol.replace(':', '') ||
    'https'
  )
}

function getLocale(request: NextRequest): string {
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value
  if (localeCookie && locales.includes(localeCookie as any)) {
    return localeCookie
  }

  const acceptLanguage = request.headers.get('Accept-Language')
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage.split(',')[0].split('-')[0]
    if (locales.includes(preferredLocale as any)) {
      return preferredLocale
    }
  }

  return defaultLocale
}

export async function proxy(request: NextRequest) {
  const host = getForwardedHost(request) || request.nextUrl.host
  const proto = getForwardedProto(request)

  const shouldCanonicalizeHost =
    host.startsWith('www.') && (host.endsWith('inakilozano.com') || host.endsWith('inakilozano.dev'))
  const shouldCanonicalizeProto =
    proto === 'http' && (host.endsWith('inakilozano.com') || host.endsWith('inakilozano.dev'))

  if (shouldCanonicalizeHost || shouldCanonicalizeProto) {
    const url = request.nextUrl.clone()
    url.protocol = 'https:'
    url.host = host.startsWith('www.') ? host.slice(4) : host
    return NextResponse.redirect(url, 308)
  }

  const pathname = request.nextUrl.pathname

  if (pathname === '/$') {
    return NextResponse.redirect(new URL(`/${getLocale(request)}`, request.url), 308)
  }

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length >= 2 && locales.includes(segments[0] as any) && locales.includes(segments[1] as any)) {
    const normalized = `/${[segments[0], ...segments.slice(2)].join('/')}`
    return NextResponse.redirect(new URL(normalized || `/${segments[0]}`, request.url), 308)
  }

  if (pathname.startsWith('/admin')) {
    const response = NextResponse.next()
    response.headers.set('X-DNS-Prefetch-Control', 'on')
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'same-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    try {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      })

      if (pathname === '/admin/login' && token) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }

      if (pathname !== '/admin/login' && !token) {
        const loginUrl = new URL('/admin/login', request.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
      }

      return response
    } catch (error) {
      console.error('Auth error in proxy:', error)
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  )

  if (pathnameIsMissingLocale) {
    const locale = getLocale(request)
    return NextResponse.redirect(
      new URL(`/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`, request.url)
    )
  }

  const response = NextResponse.next()
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'same-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon|.*\\..*|sitemap|robots).*)',
  ],
}
