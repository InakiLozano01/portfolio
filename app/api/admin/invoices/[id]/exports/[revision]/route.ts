import { adminRoute, invoiceId, revisionId, privateHeaders } from '@/lib/invoices/http'
import { invoiceStore } from '@/lib/invoices/store'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, context: { params: Promise<{ id: string; revision: string }> }) {
  return adminRoute(request, async () => {
    const params = await context.params
    const revision = revisionId(params.revision)
    const result = await invoiceStore().pdf(invoiceId(params.id), revision)
    return new Response(new Uint8Array(result.pdf), { headers: {
      ...privateHeaders, 'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${params.id}-v${revision}.pdf"`,
      'Content-Length': String(result.pdf.length), 'ETag': `"${result.sha256}"`,
    } })
  })
}
