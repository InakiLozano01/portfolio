// Resolve the real client IP behind the Cloudflare → host-nginx → app chain.
// Cloudflare sets AND overwrites `cf-connecting-ip` with the true client IP, so
// it is trustworthy at the app. NEVER trust the leftmost `X-Forwarded-For`
// value — it is client-suppliable and would let an attacker forge the rate-limit
// key. If falling back to XFF, use the RIGHTMOST hop (appended by the trusted proxy).
export function getClientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1]
  }
  return 'unknown'
}
