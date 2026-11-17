// Responses, the answer key and grading.
import { getClientIp } from '@/lib/client-ip'
import { hit } from '@/lib/rate-limit'
import { HttpError, LIMITS, bad, notFound, one, q, tx } from './db'
import { RESPONDER_COOKIE, atLeast, checkEmail, cookie, cookies, type Effective, type Visitor } from './access'
import { ownerAddress, sendPlain } from './mail'
import { artifactUrl, type Artifact } from './store'
import { randomToken, sha256 } from './util'

type Key = Record<string, { answer: unknown; points?: number }>

export function checkAnswerKey(key: unknown): Key {
  if (!key || typeof key !== 'object' || Array.isArray(key)) throw bad('answer key must be an object of {questionId: {answer, points?}}')
  for (const [id, v] of Object.entries(key as Record<string, any>)) {
    if (!v || typeof v !== 'object' || !('answer' in v)) throw bad(`answer key entry ${id} needs "answer"`)
    if (v.points != null && (typeof v.points !== 'number' || !(v.points >= 0))) throw bad(`answer key entry ${id}: points must be a number >= 0`)
  }
  if (Buffer.byteLength(JSON.stringify(key)) > LIMITS.answerKey) throw new HttpError(413, 'too_large', 'answer key too large')
  return key as Key
}

const norm = (v: unknown) => String(v).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase()

/** Exact match per question: a list compares as a set, text is normalised, anything else must be equal. */
function correct(expected: unknown, given: unknown) {
  if (Array.isArray(expected)) {
    if (!Array.isArray(given)) return false
    const a = new Set(expected.map(norm))
    const b = new Set(given.map(norm))
    return a.size === b.size && [...a].every((x) => b.has(x))
  }
  if (typeof expected === 'string') return typeof given === 'string' || typeof given === 'number' ? norm(expected) === norm(given) : false
  return JSON.stringify(expected) === JSON.stringify(given)
}

export function grade(key: Key | null, answers: Record<string, unknown>) {
  if (!key) return { score: null, maxScore: null }
  let score = 0
  let maxScore = 0
  for (const [id, { answer, points = 1 }] of Object.entries(key)) {
    maxScore += points
    if (correct(answer, answers[id])) score += points
  }
  return { score, maxScore }
}

const answerKeyOf = async (artifactId: number, client?: any) =>
  ((await one('SELECT key FROM artifacts.answer_keys WHERE artifact_id = $1', [artifactId], client))?.key ?? null) as Key | null

export async function setAnswerKey(a: Artifact, raw: unknown) {
  const key = checkAnswerKey(raw)
  // Replacing the key regrades every stored response in the same transaction.
  return tx(async (c) => {
    await q(`INSERT INTO artifacts.answer_keys(artifact_id, key) VALUES ($1, $2::jsonb)
      ON CONFLICT (artifact_id) DO UPDATE SET key = $2::jsonb, updated_at = now()`, [a.id, JSON.stringify(key)], c)
    const rows = await q('SELECT id, answers FROM artifacts.responses WHERE artifact_id = $1 FOR UPDATE', [a.id], c)
    for (const r of rows) {
      const g = grade(key, r.answers)
      await q('UPDATE artifacts.responses SET score = $2, max_score = $3 WHERE id = $1', [r.id, g.score, g.maxScore], c)
    }
    return { regraded: rows.length }
  })
}

export const getAnswerKey = (a: Artifact) => answerKeyOf(a.id)

export async function deleteAnswerKey(a: Artifact) {
  await tx(async (c) => {
    await q('DELETE FROM artifacts.answer_keys WHERE artifact_id = $1', [a.id], c)
    await q('UPDATE artifacts.responses SET score = NULL, max_score = NULL WHERE artifact_id = $1', [a.id], c)
  })
}

// ---------- the responder's side ----------

/** Who is responding, by the artifact's setting. A signed-in account is always itself; otherwise a browser token. */
function responder(req: Request, a: Artifact, v: Visitor) {
  if (v.owner) return { key: 'owner', accountId: null, setCookie: null as string | null }
  if (v.account) return { key: `a:${v.account.id}`, accountId: v.account.id, setCookie: null }
  if (a.responders === 'account') throw new HttpError(401, 'login_required', 'Ingresá con tu cuenta para responder')
  let tok = cookies(req)[RESPONDER_COOKIE]
  let setCookie: string | null = null
  if (!tok || !/^[\w-]{20,64}$/.test(tok)) {
    tok = randomToken(24)
    setCookie = cookie(RESPONDER_COOKIE, tok, 365 * 86400)
  }
  return { key: `b:${sha256(tok)}`, accountId: null, setCookie }
}

function feedbackView(a: Artifact, row: any, key: Key | null) {
  if (!row) return null
  const out: Record<string, unknown> = { answers: row.answers, name: row.declared_name, email: row.declared_email, submittedAt: row.created_at, updatedAt: row.updated_at }
  if (a.feedback !== 'none' && row.score != null) Object.assign(out, { score: Number(row.score), maxScore: Number(row.max_score) })
  if (a.feedback === 'answers' && key) out.correct = Object.fromEntries(Object.entries(key).map(([id, k]) => [id, k.answer]))
  return out
}

export async function getOwnResponse(req: Request, a: Artifact, v: Visitor) {
  let r
  try { r = responder(req, a, v) } catch { return { response: null } }
  if (r.setCookie) return { response: null }
  const row = await one('SELECT * FROM artifacts.responses WHERE artifact_id = $1 AND responder_key = $2', [a.id, r.key])
  return { response: feedbackView(a, row, await answerKeyOf(a.id)) }
}

export async function submitResponse(req: Request, a: Artifact, v: Visitor, role: Effective, body: Record<string, any>) {
  if (!atLeast(role, 'responder')) throw new HttpError(403, 'forbidden', 'Tu acceso no permite responder')
  if (!a.responses_open) throw new HttpError(409, 'responses_closed', 'Las respuestas están cerradas')
  const answers = body.answers
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw bad('answers must be an object')
  if (Buffer.byteLength(JSON.stringify(answers)) > LIMITS.response) throw new HttpError(413, 'too_large', 'response too large')
  const r = responder(req, a, v)
  let name: string | null = null
  let email: string | null = v.account?.email ?? null
  if (!v.account && !v.owner && a.responders === 'declared') {
    name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) || null : null
    if (body.email != null && body.email !== '') email = checkEmail(body.email)
    if (!name && !email) throw bad('Indicá tu nombre o tu email para responder')
  }
  const key = await answerKeyOf(a.id)
  // A graded response that shows its result is final: resubmitting and watching the score would reveal the answer key.
  if (key && a.feedback !== 'none' && !v.owner && !r.setCookie &&
    (await one('SELECT 1 FROM artifacts.responses WHERE artifact_id = $1 AND responder_key = $2', [a.id, r.key]))) {
    throw new HttpError(409, 'already_submitted', 'Ya enviaste tu respuesta')
  }
  const g = grade(key, answers)
  const row = await one(`INSERT INTO artifacts.responses(artifact_id, responder_key, account_id, declared_name, declared_email, answers, score, max_score)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
    ON CONFLICT (artifact_id, responder_key) DO UPDATE SET answers = $6::jsonb, declared_name = $4, declared_email = $5, score = $7, max_score = $8, updated_at = now()
    RETURNING *, (xmax = 0) AS inserted`, [a.id, r.key, r.accountId, name, email && !v.account ? email : null, JSON.stringify(answers), g.score, g.maxScore])
  const who = v.owner ? 'owner' : v.account ? (v.account.alias || v.account.email) : name || email || 'anónimo'
  if (row.inserted && a.notify_owner && ownerAddress()) {
    sendPlain(ownerAddress(), `Nueva respuesta: ${a.title}`, [`${who} respondió «${a.title}».`, ...(g.score != null ? [`Puntaje: ${g.score} de ${g.maxScore}`] : [])],
      { href: artifactUrl(a), label: 'Abrir el artifact' }).catch(() => {})
  }
  // Only an account's own address gets its answers back. A typed address is unverified, so it gets fixed text, once:
  // otherwise anyone could mail their own words to any address from the owner's sender.
  if (v.account) {
    if (hit(`artifacts:copy:${email}`, 5, 3600e3).ok) {
      sendPlain(email!, `Tu respuesta: ${a.title}`, [`Esto es lo que enviaste en «${a.title}»:`, JSON.stringify(answers, null, 2)], { href: artifactUrl(a), label: 'Abrir' }).catch(() => {})
    }
  } else if (email && row.inserted && hit(`artifacts:copy:${email}`, 1, 24 * 3600e3).ok && hit(`artifacts:copy:ip:${getClientIp(req)}`, 5, 3600e3).ok) {
    sendPlain(email, `Tu respuesta: ${a.title}`, [`Recibimos tu respuesta en «${a.title}».`], { href: artifactUrl(a), label: 'Abrir' }).catch(() => {})
  }
  return { response: feedbackView(a, row, key), setCookie: r.setCookie }
}

// ---------- the owner's side ----------

export const listResponses = (a: Artifact) =>
  q(`SELECT r.id::int, r.answers, r.declared_name AS name, COALESCE(acc.email, r.declared_email) AS email, acc.alias,
    CASE WHEN r.responder_key = 'owner' THEN 'owner' WHEN r.account_id IS NOT NULL THEN 'account' WHEN r.responder_key LIKE 'a:%' THEN 'deleted account' ELSE 'browser' END AS identity,
    r.score::float8 AS score, r.max_score::float8 AS "maxScore", r.created_at AS "submittedAt", r.updated_at AS "updatedAt"
    FROM artifacts.responses r LEFT JOIN artifacts.accounts acc ON acc.id = r.account_id WHERE r.artifact_id = $1 ORDER BY r.created_at`, [a.id])

export async function deleteResponse(a: Artifact, id: string) {
  const r = await q('DELETE FROM artifacts.responses WHERE artifact_id = $1 AND id = $2 RETURNING 1', [a.id, Number(id) || 0])
  if (!r.length) throw notFound('Response')
}

/** CSV with one column per answer field; cells that a spreadsheet would run as a formula are quoted with a leading '. */
export function responsesCsv(rows: any[]) {
  const fields = [...new Set(rows.flatMap((r) => Object.keys(r.answers || {})))].sort()
  const head = ['id', 'submittedAt', 'updatedAt', 'identity', 'name', 'email', 'alias', 'score', 'maxScore', ...fields]
  const cell = (v: unknown) => {
    const s = v == null ? '' : typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v instanceof Date ? v.toISOString() : String(v)
    return `"${s.replace(/^[=+\-@\t\r]/, "'$&").replaceAll('"', '""')}"`
  }
  return [head, ...rows.map((r) => [r.id, r.submittedAt, r.updatedAt, r.identity, r.name, r.email, r.alias, r.score, r.maxScore, ...fields.map((f) => r.answers?.[f])])]
    .map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n'
}
