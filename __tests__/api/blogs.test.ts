import { GET, POST } from '../../app/api/blogs/route'
import { connectToDatabase } from '../../lib/mongodb'

jest.mock('../../lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
}))

describe('Blogs API', () => {
  it('returns 500 on DB error', async () => {
    ;(connectToDatabase as jest.Mock).mockRejectedValue(new Error('db error'))
    const res = await GET()
    expect(res.status).toBe(500)
  })
})
