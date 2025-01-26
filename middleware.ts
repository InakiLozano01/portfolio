import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const isDevelopment = process.env.NODE_ENV !== 'production'

// Rate limit configuration
const RATE_LIMIT_DURATION = 10 // seconds
const RATE_LIMIT_REQUESTS = 10 // max requests per duration

export async function middleware(request: NextRequest) {
  // Add security headers
  const response = NextResponse.next()
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'same-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Check if the request is for the admin area
  if (request.nextUrl.pathname.startsWith('/admin')) {
    try {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      })

      // If we're on the login page and already authenticated, redirect to admin
      if (request.nextUrl.pathname === '/admin/login' && token) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }

      // If we're not on the login page and not authenticated, redirect to login
      if (request.nextUrl.pathname !== '/admin/login' && !token) {
        const loginUrl = new URL('/admin/login', request.url)
        loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
      }

      return response
    } catch (error) {
      console.error('Auth error in middleware:', error)
      // Redirect to login on any auth error
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
} 