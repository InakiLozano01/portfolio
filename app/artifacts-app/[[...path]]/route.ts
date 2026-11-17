import { handleApp } from '@/lib/artifacts/app'
import { isAppHost, originalPath } from '@/lib/artifacts/route'

export const dynamic = 'force-dynamic'

async function handler(req: Request) {
  const path = originalPath(req, isAppHost)
  return path ? handleApp(req, path) : new Response('Not found', { status: 404 })
}

export { handler as GET, handler as HEAD, handler as POST, handler as PUT, handler as PATCH, handler as DELETE }
