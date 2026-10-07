// Fixed-window, in-process rate limiter. The app runs as a single container, so process memory is the
// shared state; a restart resets the counters, which only ever errs toward letting someone retry.
const buckets = new Map<string, { count: number; resetAt: number }>()
let lastSweep = 0

function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key)
}

/** Counts one hit against `key`. Returns whether it is still within `limit` hits per `windowMs`. */
export function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  sweep(now)
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  bucket.count++
  return { ok: bucket.count <= limit, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
}

/** Whether `key` is already over `limit`, without counting a hit. */
export function blocked(key: string, limit: number) {
  const bucket = buckets.get(key)
  return !!bucket && bucket.resetAt > Date.now() && bucket.count >= limit
}

export function reset(key: string) {
  buckets.delete(key)
}

/** Same resolution order as getClientIp, for places that only see a plain header record (next-auth). */
export function clientIpFromHeaders(headers: Record<string, string | string[] | undefined> | undefined): string {
  const read = (name: string) => {
    const value = headers?.[name]
    return (Array.isArray(value) ? value[0] : value)?.trim() || ''
  }
  const cf = read('cf-connecting-ip')
  if (cf) return cf
  const real = read('x-real-ip')
  if (real) return real
  const parts = read('x-forwarded-for').split(',').map((s) => s.trim()).filter(Boolean)
  return parts.length ? parts[parts.length - 1] : 'unknown'
}
