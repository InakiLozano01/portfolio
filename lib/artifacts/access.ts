// Who may do what: owner, accounts, shares, shared passwords, sessions, invitations and resets.
import { encode } from 'next-auth/jwt'
import { getAdminSession } from '@/lib/admin-auth'
import { authOptions, authorizeAdmin } from '@/lib/auth'
import Admin from '@/models/Admin'
import { getClientIp } from '@/lib/client-ip'
import { blocked, hit, reset } from '@/lib/rate-limit'
import { CFG, HttpError, bad, notFound, one, q, tx } from './db'
import { sendPlain } from './mail'
import { artifactUrl, bumpEpoch, type Artifact } from './store'
import { EMAIL_RE, dummyHash, hashPassword, randomToken, sha256, verifyPassword } from './util'

export const ROLES = ['viewer', 'responder', 'editor'] as const
export type Role = (typeof ROLES)[number]
export type Effective = Role | 'owner' | null
const RANK: Record<string, number> = { viewer: 1, responder: 2, editor: 3, owner: 4 }
export const atLeast = (role: Effective, min: Role) => !!role && RANK[role] >= RANK[min]
export const checkRole = (r: unknown): Role => {
  if (!ROLES.includes(r as Role)) throw bad('role must be viewer, responder or editor')
  return r as Role
}

const SESSION_DAYS = 30
const WINDOW = 15 * 60e3
const ACCOUNT_COOKIE = '__Host-artifacts'
const pwCookie = (id: number) => `__Host-artifacts-p${id}`
export const RESPONDER_COOKIE = '__Host-artifacts-r'

// Lax so the link in an invitation email arrives signed in; writes still need the shell header, Origin and CSRF token.
export const cookie = (name: string, value: string, maxAgeSec: number) =>
  `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`

export function cookies(req: Request) {
  return Object.fromEntries((req.headers.get('cookie') || '').split(';').map((c) => c.trim().split('=')).filter((p) => p.length === 2))
}

export interface Visitor {
  owner: boolean
  account: { id: number; email: string; alias: string | null; csrf: string } | null
}

export async function visitor(req: Request): Promise<Visitor> {
  const owner = !!(await getAdminSession().catch(() => null))
  const tok = cookies(req)[ACCOUNT_COOKIE]
  const account = tok
    ? (await one(`SELECT a.id::int, a.email, a.alias, s.csrf FROM artifacts.sessions s JOIN artifacts.accounts a ON a.id = s.account_id
        WHERE s.token_hash = $1 AND s.expires_at > now()`, [sha256(tok)])) ?? null
    : null
  return { owner, account }
}

/** The shared-password session for this artifact, if the visitor entered the current password. */
export async function passwordSession(req: Request, a: Artifact) {
  const tok = cookies(req)[pwCookie(a.id)]
  if (!tok || a.access !== 'password') return null
  return (await one('SELECT csrf FROM artifacts.sessions WHERE token_hash = $1 AND artifact_id = $2 AND password_epoch = $3 AND expires_at > now()',
    [sha256(tok), a.id, a.password_epoch])) ?? null
}

/** Effective role = owner, else the highest of the account's share and the general access the visitor satisfies. */
export async function effectiveRole(req: Request, a: Artifact, v: Visitor): Promise<Effective> {
  if (v.owner) return 'owner'
  let best: Effective = null
  const raise = (r: Role) => { if (!best || RANK[r] > RANK[best]) best = r }
  if (v.account) {
    const s = await one('SELECT role FROM artifacts.shares WHERE artifact_id = $1 AND account_id = $2', [a.id, v.account.id])
    if (s) raise(s.role)
  }
  if (a.access === 'link') raise(a.access_role)
  if (a.access === 'password' && (await passwordSession(req, a))) raise(a.access_role)
  return best
}

/** Refuses once any key has `limit` failures in the window; only failed attempts (401/410) count. */
async function guarded<T>(keys: string[], limit: number, fn: () => Promise<T>): Promise<T> {
  if (keys.some((k) => blocked(k, limit))) throw new HttpError(429, 'rate_limited', 'Too many attempts, try again later', { retryAfter: WINDOW / 1000 })
  try {
    return await fn()
  } catch (e) {
    if (e instanceof HttpError && (e.status === 401 || e.status === 410)) keys.forEach((k) => hit(k, limit, WINDOW))
    throw e
  }
}

function limited(keys: string[], limit: number) {
  const results = keys.map((k) => hit(k, limit, WINDOW))
  const over = results.find((r) => !r.ok)
  if (over) throw new HttpError(429, 'rate_limited', 'Too many attempts, try again later', { retryAfter: over.retryAfter })
}

async function newSession(fields: { account_id?: number; artifact_id?: number; password_epoch?: number }) {
  const token = randomToken(32)
  const csrf = randomToken(24)
  await q(`INSERT INTO artifacts.sessions(token_hash, account_id, artifact_id, password_epoch, csrf, expires_at)
    VALUES ($1, $2, $3, $4, $5, now() + interval '${SESSION_DAYS} days')`,
    [sha256(token), fields.account_id ?? null, fields.artifact_id ?? null, fields.password_epoch ?? null, csrf])
  return { token, csrf }
}
const MAX_AGE = SESSION_DAYS * 86400

export async function accountSignIn(req: Request, email: string, password: string) {
  const acctKey = `artifacts:login:acct:${email}`
  const acct = await guarded([`artifacts:login:ip:${getClientIp(req)}`, acctKey], 10, async () => {
    const acct = await one('SELECT id::int, password_hash FROM artifacts.accounts WHERE email = $1', [email])
    const ok = (await verifyPassword(password, acct?.password_hash ?? (await dummyHash()))) && !!acct?.password_hash
    if (!ok) throw new HttpError(401, 'invalid_credentials', 'Email o contraseña incorrectos')
    return acct
  })
  reset(acctKey)
  const s = await newSession({ account_id: acct.id })
  return { csrf: s.csrf, setCookie: cookie(ACCOUNT_COOKIE, s.token, MAX_AGE) }
}

export async function signOut(req: Request) {
  const tok = cookies(req)[ACCOUNT_COOKIE]
  if (tok) await q('DELETE FROM artifacts.sessions WHERE token_hash = $1', [sha256(tok)])
  return cookie(ACCOUNT_COOKIE, '', 0)
}

export async function unlock(req: Request, a: Artifact, password: unknown) {
  if (typeof password !== 'string' || password.length > 200) throw bad('password required')
  await guarded([`artifacts:unlock:ip:${getClientIp(req)}`, `artifacts:unlock:a:${a.id}`], 20, async () => {
    const ok = (await verifyPassword(password, a.password_hash ?? (await dummyHash()))) && a.access === 'password'
    if (!ok) throw new HttpError(401, 'invalid_password', 'Contraseña incorrecta')
  })
  const s = await newSession({ artifact_id: a.id, password_epoch: a.password_epoch })
  return { csrf: s.csrf, setCookie: cookie(pwCookie(a.id), s.token, MAX_AGE) }
}

// ---------- general access ----------

/** Sets general access. A new or generated shared password ends every session opened with the old one. */
export async function setAccess(a: Artifact, body: Record<string, any>) {
  const kind = body.kind ?? a.access
  if (!['restricted', 'link', 'password'].includes(kind)) throw bad('kind must be restricted, link or password')
  const role = body.role != null ? checkRole(body.role) : a.access_role
  let password: string | undefined
  if (body.generatePassword) password = randomToken(9)
  else if (body.password != null) {
    if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 200) throw bad('password must be 8-200 chars')
    password = body.password
  }
  if (kind === 'password' && !password && !a.password_hash) throw bad('a shared password is required: pass "password" or "generatePassword": true')
  const hash = password ? await hashPassword(password) : a.password_hash
  const tightened = kind !== a.access || role !== a.access_role || !!password
  await tx(async (c) => {
    await q(`UPDATE artifacts.artifacts SET access = $2, access_role = $3, password_hash = $4,
      password_epoch = password_epoch + $5, updated_at = now() WHERE id = $1`, [a.id, kind, role, hash, password ? 1 : 0], c)
    if (password) await q('DELETE FROM artifacts.sessions WHERE artifact_id = $1', [a.id], c)
    if (tightened) await bumpEpoch(a.id, c)
  })
  return body.generatePassword ? { password } : {}
}

// ---------- accounts and shares ----------

export function checkEmail(e: unknown) {
  const email = typeof e === 'string' ? e.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(email) || email.length > 254) throw bad('a valid email is required')
  return email
}

const displayName = (acct: { email: string; alias: string | null }) => acct.alias || acct.email

export async function findAccount(ref: string) {
  const acct = /^\d+$/.test(ref)
    ? await one('SELECT id::int, email, alias, password_hash IS NOT NULL AS "hasPassword", created_at AS "createdAt" FROM artifacts.accounts WHERE id = $1', [Number(ref)])
    : await one('SELECT id::int, email, alias, password_hash IS NOT NULL AS "hasPassword", created_at AS "createdAt" FROM artifacts.accounts WHERE email = $1', [ref.toLowerCase()])
  if (!acct) throw notFound('Account')
  return acct as { id: number; email: string; alias: string | null; hasPassword: boolean; createdAt: Date }
}

export const listShares = (artifactId: number) =>
  q(`SELECT a.id::int AS "accountId", a.email, a.alias, s.role, a.password_hash IS NOT NULL AS "hasPassword", s.created_at AS "sharedAt"
    FROM artifacts.shares s JOIN artifacts.accounts a ON a.id = s.account_id WHERE s.artifact_id = $1 ORDER BY a.email`, [artifactId])

export const listAccounts = () =>
  q(`SELECT a.id::int, a.email, a.alias, a.password_hash IS NOT NULL AS "hasPassword", a.created_at AS "createdAt",
    COALESCE(json_agg(json_build_object('slug', x.slug, 'title', x.title, 'role', s.role) ORDER BY x.slug) FILTER (WHERE s.artifact_id IS NOT NULL), '[]') AS shares
    FROM artifacts.accounts a LEFT JOIN artifacts.shares s ON s.account_id = a.id LEFT JOIN artifacts.artifacts x ON x.id = s.artifact_id
    GROUP BY a.id ORDER BY a.email`)

/** Shares an artifact with an email. By default an invitation goes out; with notify false, a new account gets a password returned once. */
export async function share(a: Artifact, body: Record<string, any>) {
  const email = checkEmail(body.email)
  const role = checkRole(body.role)
  const alias = body.alias == null ? null : String(body.alias).trim().slice(0, 80) || null
  const notify = body.notify !== false
  const { acct, previous } = await tx(async (c) => {
    const acct = await one(`INSERT INTO artifacts.accounts(email, alias) VALUES ($1, $2)
      ON CONFLICT (email) DO UPDATE SET alias = COALESCE($2, artifacts.accounts.alias) RETURNING id::int, email, alias, password_hash`, [email, alias], c)
    const prev = await one('SELECT role FROM artifacts.shares WHERE artifact_id = $1 AND account_id = $2', [a.id, acct.id], c)
    await q(`INSERT INTO artifacts.shares(artifact_id, account_id, role) VALUES ($1, $2, $3)
      ON CONFLICT (artifact_id, account_id) DO UPDATE SET role = $3`, [a.id, acct.id, role], c)
    if (prev && RANK[role] < RANK[prev.role]) await bumpEpoch(a.id, c)
    return { acct, previous: prev?.role as Role | undefined }
  })
  const out: Record<string, unknown> = { accountId: acct.id, email, alias: acct.alias, role, url: artifactUrl(a), invited: false }
  if (previous) return { ...out, updated: true }
  if (notify) out.invited = await invite(a, acct)
  else if (!acct.password_hash) {
    const password = randomToken(9)
    await q('UPDATE artifacts.accounts SET password_hash = $2 WHERE id = $1', [acct.id, await hashPassword(password)])
    out.password = password
  }
  return out
}

/** The invitation email: a set-password link for a new account, or a straight link for an existing one. */
export async function invite(a: Artifact, acct: { id: number; email: string; alias: string | null; password_hash?: string | null }) {
  const hasPassword = acct.password_hash ?? (await one('SELECT password_hash FROM artifacts.accounts WHERE id = $1', [acct.id]))?.password_hash
  const paragraphs = [`Hola ${displayName(acct)}:`, `Se compartió con vos «${a.title}».`]
  if (hasPassword) {
    return sendPlain(acct.email, `Compartido con vos: ${a.title}`, [...paragraphs, 'Ingresá con tu email y tu contraseña de siempre.'], { href: artifactUrl(a), label: 'Abrir' })
  }
  const token = await createToken('invite', acct.id, a.id)
  return sendPlain(acct.email, `Compartido con vos: ${a.title}`, [...paragraphs, 'Elegí una contraseña para entrar. El enlace sirve una sola vez y vence en 7 días.'],
    { href: `${CFG.appOrigin()}/invite/${token}`, label: 'Elegir contraseña y abrir' })
}

export async function resendInvite(a: Artifact, accountRef: string) {
  const acct = await findAccount(accountRef)
  if (!(await one('SELECT 1 FROM artifacts.shares WHERE artifact_id = $1 AND account_id = $2', [a.id, acct.id]))) throw notFound('Share')
  return { invited: await invite(a, acct) }
}

export async function unshare(a: Artifact, accountRef: string) {
  const acct = await findAccount(accountRef)
  const removed = await tx(async (c) => {
    const r = await q('DELETE FROM artifacts.shares WHERE artifact_id = $1 AND account_id = $2 RETURNING 1', [a.id, acct.id], c)
    if (r.length) await bumpEpoch(a.id, c)
    return r.length > 0
  })
  if (!removed) throw notFound('Share')
}

export async function setAlias(ref: string, alias: unknown) {
  const acct = await findAccount(ref)
  await q('UPDATE artifacts.accounts SET alias = $2 WHERE id = $1', [acct.id, alias == null ? null : String(alias).trim().slice(0, 80) || null])
  return findAccount(String(acct.id))
}

export async function deleteAccount(ref: string) {
  const acct = await findAccount(ref)
  await tx(async (c) => {
    await q('UPDATE artifacts.artifacts SET cap_epoch = cap_epoch + 1 WHERE id IN (SELECT artifact_id FROM artifacts.shares WHERE account_id = $1)', [acct.id], c)
    await q('DELETE FROM artifacts.accounts WHERE id = $1', [acct.id], c)
  })
}

/** Owner reset: the old password and every session stop working; the person gets a reset link, or the owner a password. */
export async function ownerReset(ref: string, notify: boolean) {
  const acct = await findAccount(ref)
  const password = notify ? null : randomToken(9)
  await tx(async (c) => {
    await q('UPDATE artifacts.accounts SET password_hash = $2 WHERE id = $1', [acct.id, password ? await hashPassword(password) : null], c)
    await q('DELETE FROM artifacts.sessions WHERE account_id = $1', [acct.id], c)
    await q("DELETE FROM artifacts.tokens WHERE account_id = $1", [acct.id], c)
  })
  if (password) return { password }
  return { emailed: await sendReset(acct) }
}

// ---------- invitation and reset links ----------

async function createToken(kind: 'invite' | 'reset', accountId: number, artifactId: number | null) {
  const token = randomToken(32)
  await q(`INSERT INTO artifacts.tokens(token_hash, kind, account_id, artifact_id, expires_at)
    VALUES ($1, $2, $3, $4, now() + $5::interval)`, [sha256(token), kind, accountId, artifactId, kind === 'invite' ? '7 days' : '1 hour'])
  return token
}

async function sendReset(acct: { id: number; email: string; alias: string | null }) {
  const token = await createToken('reset', acct.id, null)
  return sendPlain(acct.email, 'Restablecer tu contraseña', [`Hola ${displayName(acct)}:`, 'Pediste restablecer tu contraseña de artifacts. El enlace sirve una sola vez y vence en una hora. Si no lo pediste, ignorá este email.'],
    { href: `${CFG.appOrigin()}/reset/${token}`, label: 'Elegir una contraseña nueva' })
}

/** Always answers the same, so it does not reveal which emails have accounts. */
export async function requestReset(req: Request, e: unknown) {
  let email: string
  try { email = checkEmail(e) } catch { return }
  limited([`artifacts:reset:ip:${getClientIp(req)}`, `artifacts:reset:acct:${email}`], 5)
  const acct = await one('SELECT id::int, email, alias FROM artifacts.accounts WHERE email = $1', [email])
  if (acct) await sendReset(acct)
}

export async function peekToken(token: string) {
  return one(`SELECT t.kind, a.email, x.slug FROM artifacts.tokens t JOIN artifacts.accounts a ON a.id = t.account_id
    LEFT JOIN artifacts.artifacts x ON x.id = t.artifact_id WHERE t.token_hash = $1 AND t.used_at IS NULL AND t.expires_at > now()`, [sha256(token)])
}

/** Spends a link: sets the password, ends older sessions, and signs the person in. */
export async function spendPasswordToken(req: Request, token: string, password: string) {
  if (password.length < 8 || password.length > 200) throw bad('La contraseña debe tener entre 8 y 200 caracteres.')
  const hash = await hashPassword(password)
  const t = await guarded([`artifacts:token:ip:${getClientIp(req)}`], 20, () => tx(async (c) => {
    const t = await one(`UPDATE artifacts.tokens SET used_at = now() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
      RETURNING account_id::int, artifact_id::int`, [sha256(token)], c)
    if (!t) throw new HttpError(410, 'expired', 'El enlace ya se usó o venció.')
    await q('UPDATE artifacts.accounts SET password_hash = $2 WHERE id = $1', [t.account_id, hash], c)
    await q('DELETE FROM artifacts.sessions WHERE account_id = $1', [t.account_id], c)
    return t
  }))
  const s = await newSession({ account_id: t.account_id })
  const slug = t.artifact_id ? (await one('SELECT slug FROM artifacts.artifacts WHERE id = $1', [t.artifact_id]))?.slug : null
  return { setCookie: cookie(ACCOUNT_COOKIE, s.token, MAX_AGE), slug: slug as string | null }
}

// ---------- owner ----------

const ownerCookieName = () => `${authOptions.useSecureCookies ? '__Secure-' : ''}next-auth.session-token`

/**
 * One sign-in form for everyone: the portfolio admin gets a NextAuth session minted on this origin (host-only cookie,
 * same secret, lifetime and password-change revocation as the console); anyone else signs in to their account.
 */
export async function signIn(req: Request, body: Record<string, any>) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : ''
  const password = typeof body.password === 'string' ? body.password.slice(0, 200) : ''
  if (!email || !password) throw bad('email and password required')
  if (await Admin.findOne({ email }).select('_id').lean()) {
    let admin: Awaited<ReturnType<typeof authorizeAdmin>> = null
    try {
      admin = await authorizeAdmin({ email, password }, { headers: Object.fromEntries(req.headers) })
    } catch (e) {
      const message = e instanceof Error ? e.message : ''
      throw /Too many/.test(message) ? new HttpError(429, 'rate_limited', message, { retryAfter: 900 }) : new HttpError(401, 'invalid_credentials', 'Email o contraseña incorrectos')
    }
    if (!admin) throw new HttpError(401, 'invalid_credentials', 'Email o contraseña incorrectos')
    const maxAge = authOptions.session?.maxAge ?? 1800
    const token = await encode({ token: { name: admin.name, email: admin.email, sub: admin.id, id: admin.id, authAt: Date.now() }, secret: process.env.NEXTAUTH_SECRET!, maxAge })
    return { owner: true, csrf: null, setCookie: `${ownerCookieName()}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${authOptions.useSecureCookies ? '; Secure' : ''}` }
  }
  return { owner: false, ...(await accountSignIn(req, email, password)) }
}

export const ownerSignOutCookie = () => `${ownerCookieName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${authOptions.useSecureCookies ? '; Secure' : ''}`
