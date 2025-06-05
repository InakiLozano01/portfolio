import { GET } from '../../app/api/blogs/[id]/comments/route'
import { connectToDatabase } from '../../lib/mongodb'

jest.mock('../../lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
}))

describe('Comments API', () => {
  it('returns 500 on DB error for GET', async () => {
    ;(connectToDatabase as jest.Mock).mockRejectedValue(new Error('db error'))
    const res = await GET({} as any, { params: { id: '1' } } as any)
    expect(res.status).toBe(500)
  })
})
