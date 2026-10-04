import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import InvoicesManager from '../../components/admin/InvoicesManager'
import type { InvoiceRecord } from '../../lib/invoices/domain'

const invoice = { issueDate: '2028-02-29', placeOfIssue: 'Argentina', supplier: 'José', representative: 'Iñaki', email: 'qa@example.test', phone: '+00 000', customerCompany: 'SYNTHETIC QA', customerAddress: 'Test address', currency: 'USD', items: [{ title: 'Diseño', description: 'Descripción', unitPrice: '0.10' }] }
const record = { id: '1e6f0e40-532d-4f5d-b672-8f2a6976c0a1', number: 'INV-2028-00001', invoice, revision: 1, paymentStatus: 'unpaid', paymentVersion: 0, createdAt: '2028-02-29T00:00:00Z', updatedAt: '2028-02-29T00:00:00Z', totalCents: '10', exports: [] }
test('admin can edit, save, export, download and manually mark paid', async () => {
  let current: InvoiceRecord = JSON.parse(JSON.stringify(record))
  const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    if (init?.method === 'PUT') current = { ...current, invoice: body.invoice, revision: 2 }
    if (init?.method === 'PATCH') current = { ...current, paymentStatus: body.status, paymentVersion: 1 }
    if (url.endsWith('/exports') && init?.method === 'POST') current = { ...current, exports: [{ revision: 2, sha256: 'a'.repeat(64), createdAt: '2028-02-29T01:00:00Z' }] }
    return { ok: true, json: async () => url.includes('?offset=') ? { invoices: [current], hasMore: false } : current }
  })
  global.fetch = fetchMock as unknown as typeof fetch
  render(<InvoicesManager />)
  fireEvent.click(await screen.findByRole('button', { name: /INV-2028-00001/ }))
  await screen.findByText('INV-2028-00001 · revision 1')
  fireEvent.change(screen.getByLabelText('Company name'), { target: { value: 'Edited QA' } })
  expect(screen.getByRole('button', { name: 'Export saved revision' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Save invoice' }))
  await screen.findByText('INV-2028-00001 · revision 2')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Export saved revision' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Export saved revision' }))
  expect(await screen.findByRole('link', { name: /Download PDF/ })).toHaveAttribute('href', expect.stringContaining('/exports/2'))
  await waitFor(() => expect(screen.getByLabelText('Payment status')).toBeEnabled())
  fireEvent.change(screen.getByLabelText('Payment status'), { target: { value: 'paid' } })
  await screen.findByText('Payment status recorded. Existing PDFs are unchanged.')
  expect(screen.getByLabelText('Payment status')).toHaveValue('paid')
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true)
})
