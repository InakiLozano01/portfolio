import { POST } from '../../app/api/projects/route'
import { getServerSession } from 'next-auth'

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

describe('Projects API', () => {
  it('returns 401 when session missing', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const req = new Request('http://localhost/api/projects', { method: 'POST' })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })
})
