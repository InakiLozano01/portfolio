import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { requireAdmin } from '../admin-auth'
import { InvoiceError } from './domain'

export const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow' }
export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: privateHeaders })
export async function adminRoute(request: Request, action: () => Promise<Response>) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) {
      for (const [key, value] of Object.entries(privateHeaders)) auth.response.headers.set(key, value)
      return auth.response
    }
    return await action()
  } catch (error) {
    if (error instanceof ZodError) return json({ error: 'Invalid invoice data', fields: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }, 400)
    if (error instanceof InvoiceError) return json({ error: error.message }, error.status)
    // Never expose SQL, connection strings, private payloads or PDF bytes in logs.
    return json({ error: 'Invoice operation failed' }, 500)
  }
}
export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new InvoiceError(415, 'JSON body required')
  const reader = request.body?.getReader()
  if (!reader) throw new InvoiceError(400, 'JSON body required')
  const blocks: Uint8Array[] = []; let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 131072) { await reader.cancel(); throw new InvoiceError(413, 'Invoice request is too large') }
      blocks.push(value)
    }
  } finally { reader.releaseLock() }
  let data: unknown
  try { data = JSON.parse(Buffer.concat(blocks).toString('utf8')) } catch { throw new InvoiceError(400, 'Invalid JSON') }
  return schema.parse(data)
}
export function invoiceId(id: string) { return z.string().uuid().parse(id) }
export function revisionId(value: string) { return z.coerce.number().int().positive().max(2147483647).parse(value) }
