import { adminRoute, invoiceId, json, readJson } from '@/lib/invoices/http'
import { updateInput } from '@/lib/invoices/domain'
import { invoiceStore } from '@/lib/invoices/store'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ id: string }> }
export async function GET(request: Request, context: Context) {
  return adminRoute(request, async () => json(await invoiceStore().get(invoiceId((await context.params).id))))
}
export async function PUT(request: Request, context: Context) {
  return adminRoute(request, async () => {
    const id = invoiceId((await context.params).id)
    const body = await readJson(request, updateInput)
    return json(await invoiceStore().update(id, body.revision, body.invoice))
  })
}
