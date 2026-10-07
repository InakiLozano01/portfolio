import { NextRequest, NextResponse } from 'next/server'
import { DELETE, PATCH } from '../../app/api/messages/[id]/route'
import { requireAdmin } from '../../lib/admin-auth'
import Contact from '../../models/Contact'

jest.mock('../../lib/admin-auth', () => ({ requireAdmin: jest.fn() }))
jest.mock('../../lib/mongodb', () => ({ connectToDatabase: jest.fn() }))
jest.mock('../../models/Contact', () => ({ __esModule: true, default: { findByIdAndUpdate: jest.fn(), findByIdAndDelete: jest.fn() } }))

const id = 'a'.repeat(24)
const context = { params: Promise.resolve({ id }) }
const request = (method: string, body?: unknown) =>
  new NextRequest(`http://localhost/api/messages/${id}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })

beforeEach(() => {
  jest.clearAllMocks()
  ;(requireAdmin as jest.Mock).mockResolvedValue({ ok: true })
})

test('only the read flag can change; other fields never reach the update', async () => {
  ;(Contact.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: id, read: true })
  const response = await PATCH(request('PATCH', { read: true, email: 'attacker@example.test', createdAt: '1999-01-01' }), context)
  expect(response.status).toBe(200)
  expect(Contact.findByIdAndUpdate).toHaveBeenCalledWith(id, { $set: { read: true } }, { new: true })
  expect(response.headers.get('cache-control')).toContain('no-store')
})

test('a body without a boolean read flag is refused', async () => {
  const response = await PATCH(request('PATCH', { message: 'rewritten' }), context)
  expect(response.status).toBe(400)
  expect(Contact.findByIdAndUpdate).not.toHaveBeenCalled()
})

test('delete requires an admin', async () => {
  ;(requireAdmin as jest.Mock).mockResolvedValue({ ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) })
  const response = await DELETE(request('DELETE'), context)
  expect(response.status).toBe(401)
  expect(Contact.findByIdAndDelete).not.toHaveBeenCalled()
})
