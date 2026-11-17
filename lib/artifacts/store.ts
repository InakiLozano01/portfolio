// Artifacts, versions, files, blobs, uploads and state.
import * as S3 from './s3.mjs'
import { CFG, HttpError, LIMITS, bad, notFound, one, q, readBody, tx } from './db'
import { ASSET_PATH_RE, CONTENT_TYPE_RE, RESERVED_SLUGS, SLUG_RE, guessType, randomToken, sha256 } from './util'

export interface Artifact {
  id: number; slug: string; title: string; current_version: number; cap_epoch: number
  access: 'restricted' | 'link' | 'password'; access_role: 'viewer' | 'responder' | 'editor'
  password_hash: string | null; password_epoch: number
  responders: 'anonymous' | 'declared' | 'account'; responses_open: boolean; feedback: 'none' | 'score' | 'answers'; notify_owner: boolean
  created_at: Date; updated_at: Date
}

const ARTIFACT_COLS = `id::int, slug, title, current_version, cap_epoch, access, access_role, password_hash, password_epoch,
  responders, responses_open, feedback, notify_owner, created_at, updated_at`

export const artifactUrl = (a: { slug: string }) => `${CFG.appOrigin()}/${a.slug}`

export async function findArtifact(ref: string | number, client?: any): Promise<Artifact> {
  const a = /^\d+$/.test(String(ref))
    ? await one(`SELECT ${ARTIFACT_COLS} FROM artifacts.artifacts WHERE id = $1`, [Number(ref)], client)
    : await one(`SELECT ${ARTIFACT_COLS} FROM artifacts.artifacts WHERE slug = $1`, [String(ref)], client)
  if (!a) throw notFound()
  return a
}

export async function checkSlug(slug: unknown, exceptId = 0) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug) || /^\d+$/.test(slug) || RESERVED_SLUGS.has(slug))
    throw bad('slug must be 1-80 chars of a-z, 0-9 and "-", contain a letter, and not be reserved')
  const taken = await one('SELECT id::int FROM artifacts.artifacts WHERE slug = $1', [slug])
  if (taken && taken.id !== exceptId) throw new HttpError(409, 'slug_taken', `Slug "${slug}" is already in use`)
  return slug
}

export async function uniqueSlug(base: string) {
  for (let i = 1; ; i++) {
    const s = i === 1 ? base : `${base.slice(0, 74)}-${i}`
    if (!RESERVED_SLUGS.has(s) && !/^\d+$/.test(s) && !(await one('SELECT 1 FROM artifacts.artifacts WHERE slug = $1', [s]))) return s
  }
}

export function checkTitle(t: unknown) {
  if (typeof t !== 'string' || !t.trim() || t.length > 200) throw bad('title must be a 1-200 char string')
  return t.trim()
}

export const bumpEpoch = (id: number, client?: any) => q('UPDATE artifacts.artifacts SET cap_epoch = cap_epoch + 1 WHERE id = $1', [id], client)

// ---------- blobs ----------

export const isVideo = (contentType: string) => contentType.startsWith('video/')

export function checkPath(p: unknown) {
  if (typeof p !== 'string' || p.length > 200 || !ASSET_PATH_RE.test(p)) throw bad(`invalid file path ${JSON.stringify(p)}`)
  if (/(^|\/)hls(\/|$)/.test(p)) throw bad('"hls" is reserved in file paths')
  return p
}
export const checkType = (contentType: unknown, p: string) =>
  typeof contentType === 'string' && CONTENT_TYPE_RE.test(contentType) ? contentType : guessType(p)

/** Stores bytes once per content; a video is queued for encoding. Returns the blob key. */
export async function storeBlob(buf: Buffer, contentType: string) {
  const sha = sha256(buf)
  const existing = await one("SELECT key FROM artifacts.blobs WHERE sha256 = $1 AND size = $2 AND content_type = $3 AND video_status IS DISTINCT FROM 'failed'", [sha, buf.length, contentType])
  if (existing) return existing.key as string
  await reserve(buf.length)
  const key = `o/${randomToken(18)}`
  await S3.putObject(key, buf, contentType)
  await q('INSERT INTO artifacts.blobs(key, sha256, size, stored_bytes, content_type, video_status) VALUES ($1, $2, $3, $3, $4, $5)',
    [key, sha, buf.length, contentType, isVideo(contentType) ? 'pending' : null])
  if (isVideo(contentType)) await enqueueEncode(key)
  return key
}

export async function storageUsed(client?: any) {
  const r = await one(`SELECT (SELECT COALESCE(SUM(stored_bytes), 0) FROM artifacts.blobs)
    + (SELECT COALESCE(SUM(size), 0) FROM artifacts.uploads WHERE completed_at IS NULL) AS used`, [], client)
  return Number(r.used)
}

/** Refuses a write that would cross the storage cap. */
export async function reserve(bytes: number, client?: any) {
  const used = await storageUsed(client)
  if (used + bytes > CFG.storageCap())
    throw new HttpError(507, 'storage_full', `Artifacts storage is full: ${used} of ${CFG.storageCap()} bytes used, this needs ${bytes} more. Delete artifacts to free space.`)
}

let redis: any = null
async function enqueueEncode(key: string) {
  if (!process.env.REDIS_URL) return console.warn('[artifacts] REDIS_URL unset; video left pending', key)
  if (!redis) {
    const { Redis } = await import('ioredis')
    redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 3 })
    redis.on('error', (e: Error) => console.error('[artifacts] redis', e.message))
  }
  await redis.lpush('artifacts:encode', key)
}

/** Removes blobs no file references (and no unfinished upload will need), with their stored objects. */
export async function gcBlobs() {
  const dead = await q(`DELETE FROM artifacts.blobs b WHERE NOT EXISTS (SELECT 1 FROM artifacts.files f WHERE f.blob_key = b.key)
    AND NOT EXISTS (SELECT 1 FROM artifacts.uploads u WHERE u.object_key = b.key) RETURNING key`)
  for (const { key } of dead) {
    await S3.deleteObject(key).catch((e) => console.error('[artifacts] gc', key, e.message))
    await S3.deletePrefix(`h/${key}/`).catch((e) => console.error('[artifacts] gc', key, e.message))
  }
}

// ---------- versions ----------

export interface NewFile { path: string; key: string }

/** New immutable version = files of `fromVersionId` (or nothing) + `files` - `remove`. */
export async function writeVersion(a: Artifact, opts: { fromVersionId?: number | null; files?: NewFile[]; remove?: string[]; note?: string | null; by: string }) {
  const { fromVersionId, files = [], remove = [], note = null, by } = opts
  return tx(async (c) => {
    const { current_version: cur } = await one('SELECT current_version FROM artifacts.artifacts WHERE id = $1 FOR UPDATE', [a.id], c)
    const next = cur + 1
    const { id: vid } = await one('INSERT INTO artifacts.versions(artifact_id, version, note, created_by) VALUES ($1, $2, $3, $4) RETURNING id::int', [a.id, next, note, by], c)
    if (fromVersionId) await q('INSERT INTO artifacts.files(version_id, path, blob_key) SELECT $1, path, blob_key FROM artifacts.files WHERE version_id = $2', [vid, fromVersionId], c)
    for (const f of files) {
      await q(`INSERT INTO artifacts.files(version_id, path, blob_key) VALUES ($1, $2, $3)
        ON CONFLICT (version_id, path) DO UPDATE SET blob_key = excluded.blob_key`, [vid, f.path, f.key], c)
    }
    if (remove.length) await q('DELETE FROM artifacts.files WHERE version_id = $1 AND path = ANY($2)', [vid, remove], c)
    const t = await one("SELECT COUNT(*)::int n, COUNT(*) FILTER (WHERE path = 'index.html')::int idx FROM artifacts.files WHERE version_id = $1", [vid], c)
    if (!t.idx) throw bad('a version must contain index.html')
    if (t.n > LIMITS.files) throw bad(`version exceeds ${LIMITS.files} files`)
    await q('UPDATE artifacts.artifacts SET current_version = $1, updated_at = now() WHERE id = $2', [next, a.id], c)
    return next
  })
}

export const versionRow = (a: Artifact, v = a.current_version) =>
  one('SELECT id::int, version FROM artifacts.versions WHERE artifact_id = $1 AND version = $2', [a.id, v])

export async function fileAt(artifactId: number, version: number, path: string) {
  return one(`SELECT f.path, b.key, b.size::float8 AS size, b.content_type, b.video_status, b.renditions FROM artifacts.files f
    JOIN artifacts.versions v ON v.id = f.version_id JOIN artifacts.blobs b ON b.key = f.blob_key
    WHERE v.artifact_id = $1 AND v.version = $2 AND f.path = $3`, [artifactId, version, path])
}

export async function artifactStorage(id: number) {
  const r = await one(`SELECT COALESCE(SUM(b.stored_bytes), 0)::float8 AS bytes FROM artifacts.blobs b WHERE b.key IN
    (SELECT f.blob_key FROM artifacts.files f JOIN artifacts.versions v ON v.id = f.version_id WHERE v.artifact_id = $1)`, [id])
  return r.bytes as number
}

// ---------- state ----------

export async function latestState(a: Artifact, rev = 0) {
  const s = rev
    ? await one('SELECT rev, doc, saved_by, saved_at FROM artifacts.state_revisions WHERE artifact_id = $1 AND rev = $2', [a.id, rev])
    : await one('SELECT rev, doc, saved_by, saved_at FROM artifacts.state_revisions WHERE artifact_id = $1 ORDER BY rev DESC LIMIT 1', [a.id])
  if (rev && !s) throw notFound(`State revision ${rev}`)
  return s ? { rev: s.rev, state: s.doc, savedBy: s.saved_by, savedAt: s.saved_at } : { rev: 0, state: null, savedBy: null, savedAt: null }
}

export async function saveState(a: Artifact, body: Record<string, any>, by: string) {
  if (!('state' in body)) throw bad('body needs "state"')
  const doc = JSON.stringify(body.state ?? null)
  if (Buffer.byteLength(doc) > LIMITS.state) throw new HttpError(413, 'too_large', `state exceeds ${LIMITS.state} bytes`)
  if (body.baseRev != null && !Number.isInteger(body.baseRev)) throw bad('baseRev must be an integer')
  return tx(async (c) => {
    await one('SELECT id FROM artifacts.artifacts WHERE id = $1 FOR UPDATE', [a.id], c)
    const { rev: cur } = await one('SELECT COALESCE(MAX(rev), 0)::int rev FROM artifacts.state_revisions WHERE artifact_id = $1', [a.id], c)
    if (body.baseRev != null && body.baseRev !== cur) throw new HttpError(409, 'conflict', 'State changed since baseRev', { currentRev: cur })
    const row = await one('INSERT INTO artifacts.state_revisions(artifact_id, rev, doc, saved_by) VALUES ($1, $2, $3::jsonb, $4) RETURNING saved_at', [a.id, cur + 1, doc, by], c)
    // shortcut: keeps the newest LIMITS.stateRevs revisions per artifact; raise it if deeper history is needed.
    await q('DELETE FROM artifacts.state_revisions WHERE artifact_id = $1 AND rev <= $2', [a.id, cur + 1 - LIMITS.stateRevs], c)
    return { rev: cur + 1, savedBy: by, savedAt: row.saved_at }
  })
}

export const stateHistory = (a: Artifact, limit = 100) =>
  q(`SELECT rev, saved_by AS "savedBy", saved_at AS "savedAt", length(doc::text) AS bytes FROM artifacts.state_revisions
    WHERE artifact_id = $1 ORDER BY rev DESC LIMIT $2`, [a.id, limit])

// ---------- uploads ----------

const UPLOAD_TTL_H = 24
const uploadView = (u: any) => ({
  id: u.id, path: u.path, size: Number(u.size), contentType: u.content_type, partSize: u.part_size,
  partCount: Math.max(1, Math.ceil(Number(u.size) / u.part_size)), received: Object.keys(u.parts).map(Number).sort((x, y) => x - y),
  completed: !!u.completed_at, expiresAt: u.expires_at,
})

export async function startUpload(a: Artifact, body: Record<string, any>) {
  const path = checkPath(body.path)
  const size = body.size
  if (!Number.isInteger(size) || size < 1 || size > LIMITS.file) throw bad(`size must be 1-${LIMITS.file} bytes`)
  const contentType = checkType(body.contentType, path)
  const fingerprint = typeof body.fingerprint === 'string' ? body.fingerprint.slice(0, 200) : null
  await sweepUploads()
  if (fingerprint) {
    const open = await one(`SELECT * FROM artifacts.uploads WHERE artifact_id = $1 AND path = $2 AND size = $3 AND fingerprint = $4
      AND completed_at IS NULL AND expires_at > now()`, [a.id, path, size, fingerprint])
    if (open) return { ...uploadView(open), resumed: true }
  }
  const objectKey = `o/${randomToken(18)}`
  return tx(async (c) => {
    // One upload start at a time, so two cannot both pass the cap check.
    await q('SELECT pg_advisory_xact_lock(7314001)', [], c)
    await reserve(size, c)
    const s3UploadId = await S3.createMultipart(objectKey, contentType)
    const u = await one(`INSERT INTO artifacts.uploads(id, artifact_id, path, size, content_type, fingerprint, object_key, s3_upload_id, part_size, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now() + interval '${UPLOAD_TTL_H} hours') RETURNING *`,
      [randomToken(12), a.id, path, size, contentType, fingerprint, objectKey, s3UploadId, LIMITS.partSize], c)
    return { ...uploadView(u), resumed: false }
  })
}

async function openUpload(id: string) {
  const u = await one('SELECT * FROM artifacts.uploads WHERE id = $1 AND expires_at > now()', [id])
  if (!u) throw notFound('Upload')
  return u
}

export async function getUpload(id: string) {
  return uploadView(await openUpload(id))
}

export async function putPart(id: string, n: number, req: Request) {
  const u = await openUpload(id)
  if (u.completed_at) throw new HttpError(409, 'completed', 'Upload already completed')
  const { partCount } = uploadView(u)
  if (!Number.isInteger(n) || n < 1 || n > partCount) throw bad(`part must be 1-${partCount}`)
  const expected = n < partCount ? u.part_size : Number(u.size) - u.part_size * (partCount - 1)
  const buf = await readBody(req, u.part_size)
  if (buf.length !== expected) throw bad(`part ${n} must be exactly ${expected} bytes, got ${buf.length}`)
  const etag = await S3.uploadPart(u.object_key, u.s3_upload_id, n, buf)
  await q("UPDATE artifacts.uploads SET parts = parts || jsonb_build_object($2::text, $3::text) WHERE id = $1", [id, String(n), etag])
  return { part: n, bytes: buf.length }
}

/** Finishes the object; the blob then exists and can be placed in a version. */
export async function completeUpload(id: string) {
  const u = await openUpload(id)
  const view = uploadView(u)
  if (!u.completed_at) {
    const missing = Array.from({ length: view.partCount }, (_, i) => i + 1).filter((n) => !u.parts[String(n)])
    if (missing.length) throw new HttpError(409, 'incomplete', `Missing parts: ${missing.join(', ')}`, { missing })
    await S3.completeMultipart(u.object_key, u.s3_upload_id, Array.from({ length: view.partCount }, (_, i) => u.parts[String(i + 1)]))
    const video = isVideo(u.content_type)
    await tx(async (c) => {
      await q('INSERT INTO artifacts.blobs(key, size, stored_bytes, content_type, video_status) VALUES ($1, $2, $2, $3, $4) ON CONFLICT (key) DO NOTHING',
        [u.object_key, u.size, u.content_type, video ? 'pending' : null], c)
      await q('UPDATE artifacts.uploads SET completed_at = now() WHERE id = $1', [id], c)
    })
    if (video) await enqueueEncode(u.object_key)
  }
  return { ...u, path: u.path as string, key: u.object_key as string }
}

/** Places completed uploads in a version, then forgets the uploads. */
export async function consumeUploads(a: Artifact, ids: unknown) {
  if (ids == null) return []
  if (!Array.isArray(ids)) throw bad('uploads must be an array of upload ids')
  const files: NewFile[] = []
  for (const id of ids) {
    const u = await one('SELECT path, object_key FROM artifacts.uploads WHERE id = $1 AND artifact_id = $2 AND completed_at IS NOT NULL', [String(id), a.id])
    if (!u) throw bad(`upload ${id} is not completed for this artifact`)
    files.push({ path: u.path, key: u.object_key })
  }
  return files
}
export const forgetUploads = (ids: unknown) =>
  Array.isArray(ids) && ids.length ? q('DELETE FROM artifacts.uploads WHERE id = ANY($1) AND completed_at IS NOT NULL', [ids.map(String)]) : Promise.resolve([])

export async function abortUpload(id: string) {
  const u = await one('DELETE FROM artifacts.uploads WHERE id = $1 RETURNING *', [id])
  if (!u) throw notFound('Upload')
  if (!u.completed_at) await S3.abortMultipart(u.object_key, u.s3_upload_id)
  else await gcBlobs()
}

/** Expired uploads release their reservation and their parts. */
async function sweepUploads() {
  const dead = await q('DELETE FROM artifacts.uploads WHERE expires_at <= now() RETURNING object_key, s3_upload_id, completed_at')
  for (const u of dead) if (!u.completed_at) await S3.abortMultipart(u.object_key, u.s3_upload_id).catch(() => {})
  if (dead.some((u) => u.completed_at)) await gcBlobs()
}
