import { adminFetch, clearAdminCache } from '@/lib/admin-fetch'

beforeEach(() => {
  clearAdminCache()
  global.fetch = jest.fn().mockImplementation(async () => Response.json({ value: 1 }))
})
afterEach(() => jest.restoreAllMocks())

test('returning to a list reuses data with independently readable responses', async () => {
  expect(await (await adminFetch('/api/blogs?view=summary')).json()).toEqual({ value: 1 })
  expect(await (await adminFetch('/api/blogs?view=summary')).json()).toEqual({ value: 1 })
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('simultaneous list consumers share one request', async () => {
  const responses = await Promise.all([adminFetch('/api/skills'), adminFetch('/api/skills')])
  expect(await Promise.all(responses.map(r => r.json()))).toEqual([{ value: 1 }, { value: 1 }])
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('mutations and leaving the admin invalidate cached private lists', async () => {
  await adminFetch('/api/skills')
  await adminFetch('/api/skills', { method: 'PUT' })
  await adminFetch('/api/skills')
  expect(fetch).toHaveBeenCalledTimes(3)
  clearAdminCache()
  await adminFetch('/api/skills')
  expect(fetch).toHaveBeenCalledTimes(4)
})

test('failed requests and full documents are never cached', async () => {
  const mock = fetch as jest.Mock
  mock.mockResolvedValue(Response.json({ error: 'Unauthorized' }, { status: 401 }))
  await adminFetch('/api/skills'); await adminFetch('/api/skills')
  mock.mockResolvedValue(Response.json({ value: 1 }))
  await adminFetch('/api/blogs/private-id'); await adminFetch('/api/blogs/private-id')
  expect(fetch).toHaveBeenCalledTimes(4)
})

test('an old request cannot repopulate the cache after logout or a mutation', async () => {
  let finish!: (response: Response) => void
  ;(fetch as jest.Mock).mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve }))
  const old = adminFetch('/api/skills')
  clearAdminCache()
  finish(Response.json({ value: 0 }))
  await old
  expect(await (await adminFetch('/api/skills')).json()).toEqual({ value: 1 })
  expect(fetch).toHaveBeenCalledTimes(2)
})

test('lists expire after 30 seconds', async () => {
  const clock = jest.spyOn(Date, 'now').mockReturnValue(1000)
  await adminFetch('/api/skills')
  clock.mockReturnValue(31001)
  await adminFetch('/api/skills')
  expect(fetch).toHaveBeenCalledTimes(2)
})
