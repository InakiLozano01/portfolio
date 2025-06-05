import { GET } from '../../app/api/skills/route'

describe('GET /api/skills', () => {
  it('returns empty array when SKIP_DB_DURING_BUILD is true', async () => {
    process.env.SKIP_DB_DURING_BUILD = 'true'
    const res = await GET()
    const data = await res.json()
    expect(data).toEqual([])
  })
})
