import { GET as list, POST as create } from '../../app/api/admin/invoices/route'
import { GET as detail, PUT as update } from '../../app/api/admin/invoices/[id]/route'
import { PATCH as payment } from '../../app/api/admin/invoices/[id]/payment/route'
import { POST as exportPDF } from '../../app/api/admin/invoices/[id]/exports/route'
import { GET as pdf } from '../../app/api/admin/invoices/[id]/exports/[revision]/route'
import { requireAdmin } from '../../lib/admin-auth'
import { invoiceStore } from '../../lib/invoices/store'
import { NextResponse } from 'next/server'

jest.mock('../../lib/admin-auth', () => ({ requireAdmin: jest.fn() }))
jest.mock('../../lib/invoices/store', () => ({ invoiceStore: jest.fn() }))
jest.mock('../../lib/invoices/pdf', () => ({ renderInvoice: jest.fn() }))
const context = { params: Promise.resolve({ id: '1e6f0e40-532d-4f5d-b672-8f2a6976c0a1', revision: '1' }) }
const cases = [['list', 'GET', list], ['create', 'POST', create], ['detail', 'GET', detail], ['update', 'PUT', update], ['payment', 'PATCH', payment], ['export', 'POST', exportPDF], ['PDF', 'GET', pdf]] as const
beforeEach(() => jest.clearAllMocks())
test.each(cases)('%s requires admin before touching storage or parsing input', async (_name, method, handler) => {
  ;(requireAdmin as jest.Mock).mockResolvedValue({ ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) })
  const request = new Request('http://localhost/api/admin/invoices', { method })
  const response = await handler(request, context)
  expect(response.status).toBe(401)
  expect(response.headers.get('cache-control')).toContain('no-store')
  expect(requireAdmin).toHaveBeenCalledWith(request)
  expect(invoiceStore).not.toHaveBeenCalled()
})
test('invalid data is rejected after successful authorization', async () => {
  ;(requireAdmin as jest.Mock).mockResolvedValue({ ok: true })
  const response = await create(new Request('http://localhost/api/admin/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: 'invalid', invoice: { total: 1 } }) }))
  expect(response.status).toBe(400)
  expect(invoiceStore).not.toHaveBeenCalled()
})
test('streamed body size is bounded without trusting Content-Length', async () => {
  ;(requireAdmin as jest.Mock).mockResolvedValue({ ok: true })
  const response = await create(new Request('http://localhost/api/admin/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: ' '.repeat(131073) }))
  expect(response.status).toBe(413)
  expect(invoiceStore).not.toHaveBeenCalled()
})
test('PDF GET returns the exact stored bytes privately', async () => {
  ;(requireAdmin as jest.Mock).mockResolvedValue({ ok: true })
  const bytes = Buffer.from('%PDF-synthetic-original-bytes')
  ;(invoiceStore as jest.Mock).mockReturnValue({ pdf: jest.fn().mockResolvedValue({ pdf: bytes, sha256: 'a'.repeat(64) }) })
  const response = await pdf(new Request('http://localhost/api/admin/invoices'), context)
  expect(response.status).toBe(200)
  expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes)
  expect(response.headers.get('content-type')).toBe('application/pdf')
  expect(response.headers.get('cache-control')).toContain('no-store')
  expect(response.headers.get('content-disposition')).toMatch(/^attachment;/)
})
