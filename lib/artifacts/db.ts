import { pool } from '@/lib/postgres-store'

import { ORIGINS } from './route'

export const CFG = {
  appOrigin: ORIGINS.app,
  contentOrigin: ORIGINS.content,
  storageCap: () => Number(process.env.ARTIFACTS_STORAGE_CAP_BYTES) || 20 * 2 ** 30,
}

export const LIMITS = {
  body: 40 << 20, inlineFile: 15 << 20, file: 2 ** 30, files: 300, state: 2 << 20, stateRevs: 500,
  partSize: 16 << 20, response: 256 << 10, answerKey: 256 << 10,
}
export const ROBOTS = 'noindex, nofollow, noarchive'
export const SANDBOX = 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads'

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public extra: Record<string, unknown> = {}) {
    super(message)
  }
}
export const bad = (message: string) => new HttpError(400, 'bad_request', message)
export const notFound = (what = 'Artifact') => new HttpError(404, 'not_found', `${what} not found`)

type Client = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }> }

export async function q<T = any>(sql: string, params: unknown[] = [], client: Client = pool()): Promise<T[]> {
  return (await client.query(sql, params)).rows
}
export async function one<T = any>(sql: string, params: unknown[] = [], client: Client = pool()): Promise<T | undefined> {
  return (await client.query(sql, params)).rows[0]
}

export async function tx<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const client = await pool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

let secret: Promise<string> | null = null
/** HMAC key for content capabilities, created once and kept in the database. */
export function contentSecret() {
  return (secret ??= (async () => {
    const { randomToken } = await import('./util')
    await q("INSERT INTO artifacts.settings(key, value) VALUES ('content_secret', $1) ON CONFLICT (key) DO NOTHING", [randomToken(32)])
    return (await one("SELECT value FROM artifacts.settings WHERE key = 'content_secret'")).value as string
  })().catch((e) => { secret = null; throw e }))
}

export function errorResponse(e: unknown) {
  if (!(e instanceof HttpError)) console.error('[artifacts]', e)
  const err = e instanceof HttpError ? e : new HttpError(500, 'internal', 'Internal error')
  const headers: Record<string, string> = { 'Cache-Control': 'no-store', 'X-Robots-Tag': ROBOTS }
  if (err.extra.retryAfter) headers['Retry-After'] = String(err.extra.retryAfter)
  if (err.extra.auth) headers['WWW-Authenticate'] = 'Bearer'
  const { retryAfter: _r, auth: _a, ...rest } = err.extra
  return Response.json({ error: { code: err.code, message: err.message, ...rest } }, { status: err.status, headers })
}

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': ROBOTS, ...headers } })

export async function readBody(req: Request, limit: number) {
  if (Number(req.headers.get('content-length') || 0) > limit) throw new HttpError(413, 'too_large', `Body exceeds ${limit} bytes`)
  const reader = req.body?.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (reader) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > limit) {
      await reader.cancel()
      throw new HttpError(413, 'too_large', `Body exceeds ${limit} bytes`)
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

export async function readJson(req: Request, limit: number): Promise<Record<string, any>> {
  const buf = await readBody(req, limit)
  try {
    const v = JSON.parse(buf.toString('utf8') || '{}')
    if (v && typeof v === 'object' && !Array.isArray(v)) return v
  } catch {}
  throw bad('Body must be a JSON object')
}
