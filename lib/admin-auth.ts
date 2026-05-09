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
  const admin = await Admin.findOne({ email: session.user.email }).select('_id').lean()
  if (!admin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (request && request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin')
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
