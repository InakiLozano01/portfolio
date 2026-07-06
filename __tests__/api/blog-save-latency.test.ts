import BlogModel from '../../models/Blog'
import { connectToDatabase } from '../../lib/mongodb'
import { requireAdmin } from '../../lib/admin-auth'
import { notifyBlogSubscribers } from '../../lib/server/blog-newsletter'
import { POST } from '../../app/api/blogs/route'
import { PUT } from '../../app/api/blogs/[id]/route'

jest.mock('../../lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
}))

jest.mock('../../lib/admin-auth', () => ({
  requireAdmin: jest.fn(),
}))

jest.mock('../../lib/server/blog-newsletter', () => ({
  notifyBlogSubscribers: jest.fn(),
}))

jest.mock('../../models/Blog', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}))

const validPayload = {
  title_en: 'Save latency check',
  title_es: 'Control de latencia de guardado',
  subtitle_en: 'The admin save response is independent from newsletter delivery.',
  subtitle_es: 'La respuesta de guardado no depende del envio del newsletter.',
  content_en: '<p>English content</p>',
  content_es: '<p>Contenido en espanol</p>',
  slug: 'save-latency-check',
  published: true,
  tags: ['ops'],
}

const createJsonRequest = (method: 'POST' | 'PUT') =>
  new Request('http://localhost/api/blogs', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validPayload),
  })

const expectFastResponse = async (responsePromise: Promise<Response>) => {
  const result = await Promise.race([
    responsePromise.then((response) => response.status),
    new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 25)),
  ])

  expect(result).toBe(200)
}

describe('blog save latency', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(connectToDatabase as jest.Mock).mockResolvedValue({})
    ;(requireAdmin as jest.Mock).mockResolvedValue({ ok: true, session: { user: { email: 'admin@example.com' } } })
    ;(notifyBlogSubscribers as jest.Mock).mockImplementation(() => new Promise(() => undefined))
  })

  it('creates a published blog without waiting for newsletter delivery', async () => {
    ;(BlogModel.create as jest.Mock).mockResolvedValue({
      ...validPayload,
      _id: '507f1f77bcf86cd799439011',
      published: true,
    })

    await expectFastResponse(POST(createJsonRequest('POST')))
    expect(notifyBlogSubscribers).toHaveBeenCalledTimes(1)
  })

  it('updates a newly published blog without waiting for newsletter delivery', async () => {
    ;(BlogModel.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011', published: false }),
    })
    ;(BlogModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      ...validPayload,
      _id: '507f1f77bcf86cd799439011',
      published: true,
    })

    await expectFastResponse(
      PUT(createJsonRequest('PUT') as any, {
        params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }),
      })
    )
    expect(notifyBlogSubscribers).toHaveBeenCalledTimes(1)
  })
})
