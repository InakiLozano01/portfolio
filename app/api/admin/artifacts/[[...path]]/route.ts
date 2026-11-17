import { requireAdmin } from '@/lib/admin-auth'
import { agentApi } from '@/lib/artifacts/api'
import { errorResponse } from '@/lib/artifacts/db'

export const dynamic = 'force-dynamic'

/** The admin console's door to the agent API: same handlers, admin session instead of a bearer token. */
async function handler(req: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response
  try {
    return await agentApi(req, (await params).path ?? [], new URL(req.url), 'owner')
  } catch (e) {
    return errorResponse(e)
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE }
