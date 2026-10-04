import { adminRoute, invoiceId, json, readJson } from '@/lib/invoices/http'
import { paymentInput } from '@/lib/invoices/domain'
import { invoiceStore } from '@/lib/invoices/store'
export const runtime = 'nodejs'
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return adminRoute(request, async () => {
    const id = invoiceId((await context.params).id)
    const body = await readJson(request, paymentInput)
    return json(await invoiceStore().payment(id, body.version, body.status))
  })
}
