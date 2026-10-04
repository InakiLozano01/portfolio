import { adminRoute, invoiceId, json, readJson } from '@/lib/invoices/http'
import { exportInput } from '@/lib/invoices/domain'
import { invoiceStore } from '@/lib/invoices/store'
import { renderInvoice } from '@/lib/invoices/pdf'
export const runtime = 'nodejs'
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return adminRoute(request, async () => {
    const id = invoiceId((await context.params).id)
    const body = await readJson(request, exportInput)
    return json(await invoiceStore().export(id, body.revision, renderInvoice), 201)
  })
}
