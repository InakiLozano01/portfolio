// The agent API. Bearer API tokens on the app origin; the admin console calls the same handler with the admin session.
import { CFG, HttpError, LIMITS, bad, json, notFound, one, q, readBody, readJson } from './db'
import * as A from './access'
import * as R from './responses'
import * as S from './store'
import { getObject } from './s3.mjs'
import { randomToken, sha256, slugify } from './util'

type Artifact = S.Artifact

function summary(a: Artifact) {
  return {
    id: a.id, slug: a.slug, title: a.title, version: a.current_version, url: S.artifactUrl(a),
    access: { kind: a.access, role: a.access_role, hasPassword: !!a.password_hash },
    responses: { who: a.responders, open: a.responses_open, feedback: a.feedback, notifyOwner: a.notify_owner },
    createdAt: a.created_at, updatedAt: a.updated_at,
  }
}

async function detail(ref: string | number) {
  const a = await S.findArtifact(ref)
  const v = await S.versionRow(a)
  return {
    ...summary(a),
    versions: await q('SELECT version, note, created_by AS "createdBy", created_at AS "createdAt" FROM artifacts.versions WHERE artifact_id = $1 ORDER BY version DESC', [a.id]),
    files: v ? await q(`SELECT f.path, b.size::float8 AS size, b.content_type AS "contentType", b.sha256, b.video_status AS video, b.error AS "videoError"
      FROM artifacts.files f JOIN artifacts.blobs b ON b.key = f.blob_key WHERE f.version_id = $1 ORDER BY f.path`, [v.id]) : [],
    shares: await A.listShares(a.id),
    stateRev: (await one('SELECT COALESCE(MAX(rev), 0)::int rev FROM artifacts.state_revisions WHERE artifact_id = $1', [a.id])).rev,
    responseCount: (await one('SELECT COUNT(*)::int n FROM artifacts.responses WHERE artifact_id = $1', [a.id])).n,
    hasAnswerKey: !!(await one('SELECT 1 FROM artifacts.answer_keys WHERE artifact_id = $1', [a.id])),
    storageBytes: await S.artifactStorage(a.id),
  }
}

async function list(tokenId: number | null = null) {
  const rows = await q(`SELECT a.id::int, a.slug, a.title, a.current_version, a.access, a.access_role, a.password_hash, a.responders, a.responses_open,
    a.feedback, a.notify_owner, a.created_at, a.updated_at,
    (SELECT COUNT(*)::int FROM artifacts.shares s WHERE s.artifact_id = a.id) AS share_count,
    (SELECT COUNT(*)::int FROM artifacts.responses r WHERE r.artifact_id = a.id) AS response_count,
    (SELECT COALESCE(SUM(b.stored_bytes), 0)::float8 FROM artifacts.blobs b WHERE b.key IN
      (SELECT f.blob_key FROM artifacts.files f JOIN artifacts.versions v ON v.id = f.version_id WHERE v.artifact_id = a.id)) AS storage
    FROM artifacts.artifacts a WHERE $1::bigint IS NULL OR (a.created_by_token = $1 AND a.access = 'restricted') ORDER BY a.updated_at DESC`, [tokenId])
  return rows.map((a) => ({ ...summary(a), shareCount: a.share_count, responseCount: a.response_count, storageBytes: a.storage }))
}

/** {html, files: [{path, content | base64, contentType?}]} → stored blobs. */
async function inlineFiles(body: Record<string, any>) {
  const out: S.NewFile[] = []
  const add = async (path: string, buf: Buffer, contentType: unknown) => {
    if (buf.length > LIMITS.inlineFile) throw new HttpError(413, 'too_large', `file ${path} exceeds ${LIMITS.inlineFile} bytes inline; use an upload`)
    out.push({ path, key: await S.storeBlob(buf, S.checkType(contentType, path)) })
  }
  if (body.html != null) {
    if (typeof body.html !== 'string') throw bad('html must be a string')
    await add('index.html', Buffer.from(body.html), null)
  }
  if (body.files != null) {
    if (!Array.isArray(body.files) || body.files.length > LIMITS.files) throw bad(`files must be an array of at most ${LIMITS.files}`)
    for (const f of body.files) {
      const path = S.checkPath(f?.path)
      if (typeof f.content === 'string') await add(path, Buffer.from(f.content), f.contentType)
      else if (typeof f.base64 === 'string') await add(path, Buffer.from(f.base64, 'base64'), f.contentType)
      else throw bad(`file ${path} needs "content" (utf8) or "base64"`)
    }
  }
  return out
}

function checkRemove(remove: unknown) {
  if (remove == null) return []
  if (!Array.isArray(remove) || remove.some((p) => typeof p !== 'string')) throw bad('removeFiles must be an array of paths')
  return remove as string[]
}

async function patchArtifact(a: Artifact, body: Record<string, any>) {
  const title = body.title != null ? S.checkTitle(body.title) : a.title
  const slug = body.slug != null ? await S.checkSlug(body.slug, a.id) : a.slug
  const r = body.responses ?? {}
  if (typeof r !== 'object') throw bad('responses must be an object')
  const who = r.who ?? a.responders
  if (!['anonymous', 'declared', 'account'].includes(who)) throw bad('responses.who must be anonymous, declared or account')
  const feedback = r.feedback ?? a.feedback
  if (!['none', 'score', 'answers'].includes(feedback)) throw bad('responses.feedback must be none, score or answers')
  const open = r.open ?? a.responses_open
  const notify = r.notifyOwner ?? a.notify_owner
  if (typeof open !== 'boolean' || typeof notify !== 'boolean') throw bad('responses.open and responses.notifyOwner must be booleans')
  await q(`UPDATE artifacts.artifacts SET title = $2, slug = $3, responders = $4, feedback = $5, responses_open = $6, notify_owner = $7, updated_at = now()
    WHERE id = $1`, [a.id, title, slug, who, feedback, open, notify])
}

export async function agentApi(req: Request, parts: string[], url: URL, by: string): Promise<Response> {
  const M = req.method
  const [r0, ref, r2, ...rest] = parts
  S.sweepUploadsHourly()
  // A limited token (see bearerActor) only reaches the restricted artifacts it created, and never shares, opens or deletes them.
  const tokenId = Number(/^limited:(\d+):/.exec(by)?.[1]) || null
  const uploadScope = /^(?:limited|agent):(\d+):/.exec(by)?.[1] ?? 'owner'
  const denied = () => new HttpError(403, 'forbidden', 'This token is limited to its own restricted artifacts')
  const own = async (artifactId: number) => {
    if (tokenId && !(await one("SELECT 1 FROM artifacts.artifacts WHERE id = $1 AND created_by_token = $2 AND access = 'restricted'", [artifactId, tokenId]))) throw notFound()
  }

  if (r0 === 'tokens') {
    // Only the owner's session manages tokens: a leaked token must not be able to mint one that outlives its revocation.
    if (by !== 'owner') throw new HttpError(403, 'forbidden', 'Only the owner can manage API tokens')
    if (M === 'GET' && !ref) return json(await q('SELECT id::int, name, limited, created_at AS "createdAt", last_used_at AS "lastUsedAt", revoked_at AS "revokedAt" FROM artifacts.api_tokens ORDER BY id'))
    if (M === 'POST' && !ref) {
      const { name, limited } = await readJson(req, 4096)
      if (typeof name !== 'string' || !/^[\w.-]{1,64}$/.test(name)) throw bad('name must match [A-Za-z0-9_.-]{1,64}')
      const token = randomToken(32)
      const row = await one('INSERT INTO artifacts.api_tokens(name, token_hash, limited) VALUES ($1, $2, $3) RETURNING id::int', [name, sha256(token), limited === true])
      return json({ id: row.id, name, limited: limited === true, token }, 201)
    }
    if (M === 'DELETE' && /^\d+$/.test(ref || '')) {
      const r = await q('UPDATE artifacts.api_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING 1', [Number(ref)])
      return json({ revoked: r.length > 0 }, r.length ? 200 : 404)
    }
  }

  if (tokenId && (r0 === 'storage' || r0 === 'accounts')) throw denied()

  if (r0 === 'storage' && M === 'GET' && !ref) {
    return json({ usedBytes: await S.storageUsed(), capBytes: CFG.storageCap(), artifacts: (await list()).map((a) => ({ slug: a.slug, storageBytes: a.storageBytes })) })
  }

  if (r0 === 'accounts') {
    if (M === 'GET' && !ref) return json(await A.listAccounts())
    if (ref && M === 'PATCH' && !r2) return json(await A.setAlias(ref, (await readJson(req, 4096)).alias))
    if (ref && M === 'DELETE' && !r2) { await A.deleteAccount(ref); return json({ deleted: true }) }
    if (ref && M === 'POST' && r2 === 'reset') return json(await A.ownerReset(ref, (await readJson(req, 4096)).notify !== false))
  }

  if (r0 === 'uploads' && ref) {
    if (tokenId) await own((await one('SELECT artifact_id::int FROM artifacts.uploads WHERE id = $1', [ref]))?.artifact_id ?? 0)
    if (M === 'GET' && !r2) return json(await S.getUpload(ref))
    if (M === 'PUT' && r2 === 'parts' && rest.length === 1) return json(await S.putPart(ref, Number(rest[0]), req))
    if (M === 'DELETE' && !r2) { await S.abortUpload(ref); return json({ aborted: true }) }
    if (M === 'POST' && r2 === 'complete') {
      const body = await readJson(req, 4096)
      const u = await S.completeUpload(ref)
      const a = await S.findArtifact(u.artifact_id)
      if (body.stage) return json({ id: ref, path: u.path, staged: true, url: S.artifactUrl(a) })
      // Claiming and writing the version happen under the same artifact/upload locks.
      const version = await S.writeVersion(a, { fromVersionId: (await S.versionRow(a))?.id, uploads: [ref], note: body.note ?? `upload ${u.path}`, by })
      return json(await detail(a.id), version == null ? 200 : 201)
    }
  }

  if (r0 !== 'artifacts') throw notFound('Endpoint')

  if (!ref) {
    if (M === 'GET') return json(await list(tokenId))
    if (M === 'POST') {
      const body = await readJson(req, LIMITS.body)
      // The old server's field: ignoring it would turn a request for a public artifact into a restricted one without a word.
      if ('visibility' in body) throw bad('visibility is gone; set general access with access: {kind: restricted|link|password, role}')
      if (tokenId && body.access) throw denied()
      const title = S.checkTitle(body.title)
      const slug = body.slug != null ? await S.checkSlug(body.slug) : await S.uniqueSlug(slugify(title))
      const files = await inlineFiles(body)
      const { id } = await one('INSERT INTO artifacts.artifacts(slug, title, created_by_token) VALUES ($1, $2, $3) RETURNING id::int', [slug, title, tokenId])
      const a = await S.findArtifact(id)
      try {
        // With no files the artifact starts empty (version 0), so a first publish with uploads becomes one complete v1.
        if (files.length) await S.writeVersion(a, { files, note: body.note ?? 'initial', by })
        if (body.access) await A.setAccess(a, body.access)
      } catch (e) {
        await q('DELETE FROM artifacts.artifacts WHERE id = $1', [id])
        await S.gcBlobs()
        throw e
      }
      return json(await detail(id), 201)
    }
  }

  const a = await S.findArtifact(ref!)
  const sub = r2 ?? ''
  await own(a.id)
  if (tokenId && ((sub === '' && M === 'DELETE') || sub === 'access' || sub === 'shares')) throw denied()

  if (sub === '') {
    if (M === 'GET') return json(await detail(a.id))
    if (M === 'PATCH') { await patchArtifact(a, await readJson(req, 65536)); return json(await detail(a.id)) }
    if (M === 'DELETE') {
      for (const u of await q('SELECT id FROM artifacts.uploads WHERE artifact_id = $1', [a.id])) await S.abortUpload(u.id)
      await q('DELETE FROM artifacts.artifacts WHERE id = $1', [a.id])
      await S.gcBlobs()
      return json({ deleted: true, slug: a.slug, url: S.artifactUrl(a) })
    }
  }
  if (sub === 'versions' && M === 'POST' && !rest.length) {
    const body = await readJson(req, LIMITS.body)
    const files = await inlineFiles(body)
    const from = body.replace ? null : (await S.versionRow(a))?.id
    const version = await S.writeVersion(a, { fromVersionId: from, files, uploads: body.uploads, remove: checkRemove(body.removeFiles), note: body.note ?? null, by })
    if (version == null) return json(await detail(a.id))
    await S.gcBlobs()
    return json(await detail(a.id), 201)
  }
  if (sub === 'rollback' && M === 'POST') {
    const { version } = await readJson(req, 4096)
    const v = Number.isInteger(version) ? await S.versionRow(a, version) : null
    if (!v) throw notFound('Version')
    await S.writeVersion(a, { fromVersionId: v.id, note: `rollback to v${version}`, by })
    return json(await detail(a.id), 201)
  }
  if (sub === 'files' && rest.length) {
    const p = rest.join('/')
    if (M === 'GET') {
      const f = await S.fileAt(a.id, url.searchParams.has('version') ? Number(url.searchParams.get('version')) : a.current_version, p)
      if (!f) throw notFound('File')
      if (f.video_status) throw new HttpError(409, 'video', 'Uploaded video is stored as HLS renditions; the original is not kept')
      const obj = await getObject(f.key)
      return new Response(obj.body, { headers: { 'Content-Type': f.content_type, 'Content-Length': String(f.size), 'Cache-Control': 'no-store', 'Content-Disposition': 'attachment' } })
    }
    if (M === 'PUT') {
      const path = S.checkPath(p)
      const buf = await readBody(req, LIMITS.inlineFile)
      const key = await S.storeBlob(buf, S.checkType(req.headers.get('content-type'), path))
      await S.writeVersion(a, { fromVersionId: (await S.versionRow(a))?.id, files: [{ path, key }], note: `upload ${path}`, by })
      await S.gcBlobs()
      return json(await detail(a.id), 201)
    }
    if (M === 'DELETE') {
      if (p === 'index.html') throw bad('index.html cannot be removed')
      await S.writeVersion(a, { fromVersionId: (await S.versionRow(a))?.id, remove: [p], note: `remove ${p}`, by })
      return json(await detail(a.id))
    }
  }
  if (sub === 'uploads' && M === 'POST' && !rest.length) return json(await S.startUpload(a, await readJson(req, 4096), uploadScope), 201)
  if (sub === 'access' && M === 'PUT') {
    const extra = await A.setAccess(a, await readJson(req, 4096))
    return json({ ...(await detail(a.id)), ...extra })
  }
  if (sub === 'shares') {
    if (M === 'GET' && !rest.length) return json(await A.listShares(a.id))
    if (M === 'PUT' && !rest.length) return json(await A.share(a, await readJson(req, 4096)))
    if (M === 'DELETE' && rest.length === 1) { await A.unshare(a, rest[0]); return json({ removed: true }) }
    if (M === 'POST' && rest.length === 2 && rest[1] === 'resend') return json(await A.resendInvite(a, rest[0]))
  }
  if (sub === 'state') {
    if (rest[0] === 'history' && M === 'GET') return json(await S.stateHistory(a, Math.min(Number(url.searchParams.get('limit')) || 100, LIMITS.stateRevs)))
    if (!rest.length && M === 'GET') return json(await S.latestState(a, Number(url.searchParams.get('rev')) || 0))
    if (!rest.length && M === 'PUT') return json(await S.saveState(a, await readJson(req, LIMITS.state + 4096), by))
  }
  if (sub === 'responses') {
    if (M === 'GET' && !rest.length) {
      const rows = await R.listResponses(a)
      if (url.searchParams.get('format') === 'csv') {
        return new Response(R.responsesCsv(rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename="${a.slug}-responses.csv"` } })
      }
      return json(rows)
    }
    if (M === 'DELETE' && rest.length === 1) { await R.deleteResponse(a, rest[0]); return json({ deleted: true }) }
  }
  if (sub === 'answer-key') {
    if (M === 'GET') return json({ key: await R.getAnswerKey(a) })
    if (M === 'PUT') return json(await R.setAnswerKey(a, (await readJson(req, LIMITS.answerKey + 4096)).key))
    if (M === 'DELETE') { await R.deleteAnswerKey(a); return json({ deleted: true }) }
  }
  throw notFound('Endpoint')
}

/** Bearer API token → actor name with token id, or null when the header is absent. */
export async function bearerActor(req: Request) {
  const header = req.headers.get('authorization')
  if (!header) return null
  const m = /^Bearer\s+(\S+)$/i.exec(header)
  const t = m && (await one('UPDATE artifacts.api_tokens SET last_used_at = now() WHERE token_hash = $1 AND revoked_at IS NULL RETURNING id::int, name, limited', [sha256(m[1])]))
  if (!t) throw new HttpError(401, 'unauthorized', 'Missing or invalid bearer token', { auth: true })
  // The actor name carries the limit, so every door (API, MCP) enforces it in agentApi.
  return t.limited ? `limited:${t.id}:${t.name}` : `agent:${t.id}:${t.name}`
}
