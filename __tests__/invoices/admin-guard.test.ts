import { requireAdmin } from '../../lib/admin-auth'
import { getServerSession } from 'next-auth'
import Admin from '../../models/Admin'
import { headers } from 'next/headers'
jest.mock('../../lib/auth', () => ({ authOptions: {} }))
jest.mock('../../lib/mongodb', () => ({ connectToDatabase: jest.fn() }))
beforeEach(() => jest.clearAllMocks())
test('a session without a persisted admin is rejected', async () => {
  ;(getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'nonadmin@example.test' } })
  ;(Admin.findOne as jest.Mock).mockReturnValue({ select: () => ({ lean: async () => null }) })
  const response = await requireAdmin(new Request('http://localhost/api/admin/invoices'))
  expect(response.ok).toBe(false)
})
test('a persisted admin is accepted and foreign-origin writes rejected', async () => {
  ;(getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'admin@example.test' } })
  ;(Admin.findOne as jest.Mock).mockReturnValue({ select: () => ({ lean: async () => ({ _id: 'synthetic' }) }) })
  ;(headers as jest.Mock).mockResolvedValue(new Headers({ host: 'portfolio.test' }))
  expect((await requireAdmin(new Request('http://portfolio.test/api/admin/invoices'))).ok).toBe(true)
  const rejected = await requireAdmin(new Request('http://portfolio.test/api/admin/invoices', { method: 'POST', headers: { origin: 'https://foreign.test' } }))
  expect(rejected.ok).toBe(false)
  if (!rejected.ok) expect(rejected.response.status).toBe(403)
})
