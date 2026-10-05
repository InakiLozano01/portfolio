import { POST, GET } from '../../app/api/blogs/[id]/comments/route'
import Comment from '../../models/Comment'
import Blog from '../../models/Blog'
import { moderateComment } from '../../lib/comments'

jest.mock('../../lib/mongodb', () => ({ connectToDatabase: jest.fn() }))
jest.mock('../../models/Comment', () => ({ __esModule: true, default: { findOne: jest.fn(), create: jest.fn(), find: jest.fn() } }))
jest.mock('../../models/Blog', () => ({ __esModule: true, default: { findOne: jest.fn() } }))
jest.mock('../../lib/comments', () => ({ ...jest.requireActual('../../lib/comments'), moderateComment: jest.fn() }))

const ctx = { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) }
const request = () => new Request('http://localhost/api/blogs/507f1f77bcf86cd799439011/comments', { method: 'POST', body: JSON.stringify({ alias: 'Reader', content: 'A technical question' }) })
beforeEach(() => {
  jest.clearAllMocks()
  ;(Blog.findOne as jest.Mock).mockReturnValue({ select: () => ({ lean: async () => ({ title: 'Article' }) }) })
  ;(Comment.findOne as jest.Mock).mockReturnValue({ sort: () => ({ lean: async () => null }) })
  ;(Comment.create as jest.Mock).mockImplementation(async data => ({ ...data, _id: '507f1f77bcf86cd799439012', votes: [], isOfficial: false, createdAt: new Date() }))
})
test.each(['approved', 'pending', 'rejected'])('persists %s decisions while returning no private evidence', async status => {
  ;(moderateComment as jest.Mock).mockResolvedValue({ status, decision: status === 'approved' ? 'allow' : status === 'pending' ? 'review' : 'deny', source: 'jev' })
  const response = await POST(request() as any, ctx)
  expect(response.status).toBe(201)
  expect(Comment.create).toHaveBeenCalledWith(expect.objectContaining({ status, moderation: expect.objectContaining({ source: 'jev' }) }))
  const result = await response.json()
  expect(result.status).toBe(status)
  expect(result.ip).toBeUndefined()
  expect(result.moderation).toBeUndefined()
})
test('public reads omit IPs, overrides and moderation evidence', async () => {
  ;(Comment.find as jest.Mock).mockReturnValue({ sort: () => ({ lean: async () => [{ _id: '1', alias: 'Reader', content: 'Hello', votes: [{ ip: 'private', value: 1 }], ip: 'private', overrides: ['private'], moderation: 'private' }] }) })
  const response = await GET({} as any, ctx)
  const result = await response.json()
  expect(result[0].votes).toEqual([{ value: 1 }])
  expect(result[0].ip).toBeUndefined()
  expect(result[0].overrides).toBeUndefined()
  expect(result[0].moderation).toBeUndefined()
})
