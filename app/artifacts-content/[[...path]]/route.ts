import { handleContent } from '@/lib/artifacts/content'
import { isContentHost, originalPath } from '@/lib/artifacts/route'

export const dynamic = 'force-dynamic'

async function handler(req: Request) {
  const path = originalPath(req, isContentHost)
  return path ? handleContent(req, path) : new Response('Not found', { status: 404 })
}

export { handler as GET, handler as HEAD, handler as POST, handler as PUT, handler as PATCH, handler as DELETE }
