import { z } from 'zod'
import { adminRoute, json, readJson } from '@/lib/invoices/http'
import { createInput } from '@/lib/invoices/domain'
import { invoiceStore } from '@/lib/invoices/store'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  return adminRoute(request, async () => {
    const offset = z.coerce.number().int().min(0).max(1000000).parse(new URL(request.url).searchParams.get('offset') || '0')
    return json(await invoiceStore().list(offset))
  })
}
export async function POST(request: Request) {
  return adminRoute(request, async () => {
    const body = await readJson(request, createInput)
    return json(await invoiceStore().create(body.requestId, body.invoice), 201)
  })
}
