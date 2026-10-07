import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import Admin from '@/models/Admin'

function normalizeHost(value: string | null) {
  return (value || '').split(',')[0].trim().toLowerCase()
}

export async function requireAdmin(request?: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  await connectToDatabase()
  const admin = await Admin.findOne({ email: session.user.email }).select('_id passwordChangedAt').lean<{ passwordChangedAt?: Date } | null>()
  if (!admin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  // A password change signs out every session that started before it.
  const changedAt = admin.passwordChangedAt ? new Date(admin.passwordChangedAt).getTime() : 0
  if (changedAt && (session.user.authAt || 0) < changedAt) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Session expired' }, { status: 401 }),
    }
  }

  if (request && request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin')
    // Browsers send Sec-Fetch-Site on every request; without an Origin, still refuse anything cross-site.
    const fetchSite = request.headers.get('sec-fetch-site')
    if (!origin && fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
      return {
        ok: false as const,
        response: NextResponse.json({ error: 'Invalid request origin' }, { status: 403 }),
      }
    }
    if (origin) {
      const headerList = await headers()
      const host = normalizeHost(headerList.get('x-forwarded-host') || headerList.get('host'))
      let originHost = ''
      try {
        originHost = normalizeHost(new URL(origin).host)
      } catch {
        return {
          ok: false as const,
          response: NextResponse.json({ error: 'Invalid request origin' }, { status: 403 }),
        }
      }

      if (host && originHost && host !== originHost) {
        return {
          ok: false as const,
          response: NextResponse.json({ error: 'Invalid request origin' }, { status: 403 }),
        }
      }
    }
  }

  return { ok: true as const, session }
}

/** For server-rendered admin pages: the signed-in admin's session, or null when it is missing, revoked or stale. */
export async function getAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  await connectToDatabase()
  const admin = await Admin.findOne({ email: session.user.email }).select('_id passwordChangedAt').lean<{ passwordChangedAt?: Date } | null>()
  if (!admin) return null
  const changedAt = admin.passwordChangedAt ? new Date(admin.passwordChangedAt).getTime() : 0
  if (changedAt && (session.user.authAt || 0) < changedAt) return null
  return session
}
