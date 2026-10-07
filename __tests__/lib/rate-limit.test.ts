import { blocked, clientIpFromHeaders, hit, reset } from '../../lib/rate-limit'

test('counts hits per key inside the window and resets on demand', () => {
  const key = `test:${Math.random()}`
  for (let i = 0; i < 3; i++) expect(hit(key, 3, 60_000).ok).toBe(true)
  expect(blocked(key, 3)).toBe(true)
  const over = hit(key, 3, 60_000)
  expect(over.ok).toBe(false)
  expect(over.retryAfter).toBeGreaterThan(0)
  reset(key)
  expect(blocked(key, 3)).toBe(false)
})

test('client IP prefers Cloudflare, then x-real-ip, then the rightmost forwarded hop', () => {
  expect(clientIpFromHeaders({ 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': '6.6.6.6' })).toBe('1.1.1.1')
  expect(clientIpFromHeaders({ 'x-real-ip': '2.2.2.2' })).toBe('2.2.2.2')
  // A client can prepend anything to X-Forwarded-For; only the hop our proxy appended counts.
  expect(clientIpFromHeaders({ 'x-forwarded-for': '6.6.6.6, 3.3.3.3' })).toBe('3.3.3.3')
  expect(clientIpFromHeaders(undefined)).toBe('unknown')
})

test('cleared optional fields become $unset only when the client sent them', () => {
  const { toUpdate } = require('../../lib/update-doc')
  expect(toUpdate({ a: 'x', githubUrl: undefined, pdf_en: undefined }, { a: 'x', githubUrl: '' })).toEqual({ $set: { a: 'x' }, $unset: { githubUrl: '' } })
  expect(toUpdate({ a: 'x' }, {})).toEqual({ $set: { a: 'x' } })
})
