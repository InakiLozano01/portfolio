// Seam A: the artifacts HTTP surface on both origins, against throwaway PostgreSQL, MinIO and Redis, mail captured.
// Run: NEXT_DIST_DIR=.next-test npx next build && npm run test:artifacts
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { ADMIN, Browser, OWNER_INBOX, ORIGIN, ROOT, agent, mailTo, removeContainers, startApp, startServices } from './stack.mjs'

const run = promisify(execFile)
const CAP = 64 << 20 // a small storage cap so the cap test does not need gigabytes
let services, app, api, token, owner
const html = (title, body = '') => `<!doctype html><html><head><title>${title}</title></head><body><h1>${title}</h1>${body}</body></html>`
const emptySha = crypto.createHash('sha256').update('').digest('hex')

before(async () => {
  services = await startServices()
  app = await startApp({ ARTIFACTS_STORAGE_CAP_BYTES: String(CAP) })
  owner = new Browser()
  assert.equal((await owner.signIn(ADMIN.email, ADMIN.password)).status, 200)
  const t = await owner.req(`${ORIGIN.app}/api/v1/tokens`, { method: 'POST', json: { name: 'test-agent' }, headers: { origin: ORIGIN.app } })
  assert.equal(t.status, 201, t.text)
  token = t.body.token
  api = agent(token)
}, { timeout: 180000 })

after(async () => {
  if (process.env.ARTIFACTS_TEST_KEEP_LOG && app) console.log(fs.readFileSync(app.logFile, 'utf8'))
  await app?.stop()
  await services?.pool.end()
  removeContainers()
})

async function create(slug, extra = {}) {
  const r = await api('POST', 'artifacts', { title: `T ${slug}`, slug, html: html(`T ${slug}`), ...extra })
  assert.equal(r.status, 201, r.text)
  return r.body
}
const setAccess = (slug, body) => api('PUT', `artifacts/${slug}/access`, body)

// Follows an invitation the way the person would: open the emailed link, choose a password, land signed in.
async function acceptInvite(browser, link, password) {
  const page = await browser.req(link)
  assert.equal(page.status, 200)
  const tokenField = /name="token" value="([^"]+)"/.exec(page.text)[1]
  return browser.req(`${ORIGIN.app}/api/password/set`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: ORIGIN.app },
    body: new URLSearchParams({ token: tokenField, password }).toString(),
  })
}

test('noindex everywhere and the sandbox on content', async () => {
  await create('noindex', { access: { kind: 'link', role: 'viewer' } })
  const b = new Browser()
  for (const url of [`${ORIGIN.app}/robots.txt`, `${ORIGIN.content}/robots.txt`]) {
    const r = await b.req(url)
    assert.match(r.text, /Disallow: \//)
    assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive')
  }
  const shell = await b.open('noindex')
  assert.equal(shell.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive')
  assert.match(shell.text, /<meta name="robots" content="noindex, nofollow, noarchive">/)
  const sandbox = /<iframe[^>]+sandbox="([^"]+)"/.exec(shell.text)[1]
  assert.doesNotMatch(sandbox, /allow-same-origin/)
  assert.ok(shell.iframe.startsWith(`${ORIGIN.content}/c/`))
  const content = await b.req(shell.iframe, { headers: { cookie: 'x=1' } })
  assert.equal(content.status, 200)
  const csp = content.headers.get('content-security-policy')
  assert.match(csp, /^sandbox allow-scripts/)
  assert.doesNotMatch(csp, /allow-same-origin/)
  assert.match(csp, new RegExp(`frame-ancestors ${ORIGIN.app}`))
  assert.equal(content.headers.get('x-frame-options'), null)
  assert.equal(content.headers.get('set-cookie'), null)
  assert.equal(content.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive')
  assert.match(content.text, /<meta name="robots" content="noindex, nofollow, noarchive"><script>/)
  assert.match(content.text, /window\.artifact=/)
  const post = await b.req(shell.iframe, { method: 'POST', body: 'x' })
  assert.equal(post.status, 405)
})

test('owner access: restricted with no shares is reachable only by the owner, and an admin password change ends it', async () => {
  await create('draft')
  const anon = await new Browser().open('draft')
  assert.equal(anon.iframe, null)
  assert.equal(anon.boot.title, null)
  assert.doesNotMatch(anon.text, /T draft/)
  const missing = await new Browser().open('no-such-artifact')
  assert.equal(missing.status, anon.status)
  assert.deepEqual({ ...missing.boot }, { ...anon.boot, id: null, slug: null })

  const o = new Browser()
  assert.equal((await o.signIn(ADMIN.email, ADMIN.password)).status, 200)
  const page = await o.open('draft')
  assert.equal(page.boot.role, 'owner')
  assert.ok(page.iframe)
  assert.match(page.text, /href="\/share\/draft"/)
  // The admin cookie is host-only on the artifacts origin.
  const setCookie = (await new Browser().signIn(ADMIN.email, ADMIN.password)).headers.get('set-cookie')
  assert.doesNotMatch(setCookie, /Domain=/i)

  await services.Admin.updateOne({ email: ADMIN.email }, { $set: { passwordChangedAt: new Date(Date.now() + 1000) } })
  const after = await o.open('draft')
  assert.equal(after.boot.role, null)
  await services.Admin.updateOne({ email: ADMIN.email }, { $unset: { passwordChangedAt: 1 } })
})

test('general access: link, shared password and restricted; tightening kills issued content links', async () => {
  const a = await create('general')
  const anon = new Browser()
  assert.equal((await anon.open('general')).iframe, null)

  assert.equal((await setAccess('general', { kind: 'link', role: 'viewer' })).status, 200)
  const linked = await anon.open('general')
  assert.equal(linked.boot.role, 'viewer')
  assert.equal(linked.boot.title, 'T general')
  assert.equal((await anon.req(linked.iframe)).status, 200)

  assert.equal((await setAccess('general', { kind: 'password' })).status, 400, 'a shared password is required')
  const gen = await setAccess('general', { kind: 'password', role: 'editor', generatePassword: true })
  assert.equal(gen.status, 200)
  assert.ok(gen.body.password.length >= 10)
  assert.equal((await anon.req(linked.iframe)).status, 403, 'the old content link stops working')
  const locked = await anon.open('general')
  assert.equal(locked.boot.role, null)
  assert.match(locked.text, /id="unlock"/)
  assert.equal(locked.boot.title, null)

  const wrong = await anon.req(`${ORIGIN.app}/api/a/${a.id}/unlock`, { method: 'POST', shell: true, json: { password: 'nope-nope-nope' } })
  assert.equal(wrong.status, 401)
  const ok = await anon.req(`${ORIGIN.app}/api/a/${a.id}/unlock`, { method: 'POST', shell: true, json: { password: gen.body.password } })
  assert.equal(ok.status, 200)
  const unlocked = await anon.open('general')
  assert.equal(unlocked.boot.role, 'editor')
  assert.equal((await anon.req(`${ORIGIN.app}/api/a/${a.id}/state`, { method: 'PUT', shell: true, json: { state: { by: 'pw' } } })).status, 200)

  // A new password ends every session opened with the old one.
  await setAccess('general', { password: 'a-brand-new-password' })
  assert.equal((await anon.open('general')).boot.role, null)
  assert.equal((await anon.req(unlocked.iframe)).status, 403)

  await setAccess('general', { kind: 'restricted' })
  const viaNewPw = new Browser()
  assert.equal((await viaNewPw.req(`${ORIGIN.app}/api/a/${a.id}/unlock`, { method: 'POST', shell: true, json: { password: 'a-brand-new-password' } })).status, 401)
})

test('shared password and sign-in attempts are rate limited', async () => {
  const a = await create('limited', { access: { kind: 'password', password: 'right-password' } })
  const b = new Browser()
  const ip = { 'cf-connecting-ip': '203.0.113.9' } // its own address, so the other tests keep their budget
  const statuses = []
  for (let i = 0; i < 22; i++) statuses.push((await b.req(`${ORIGIN.app}/api/a/${a.id}/unlock`, { method: 'POST', shell: true, headers: ip, json: { password: `wrong-${i}` } })).status)
  assert.deepEqual([statuses[0], statuses.at(-1)], [401, 429])
  assert.equal((await b.req(`${ORIGIN.app}/api/a/${a.id}/unlock`, { method: 'POST', shell: true, headers: ip, json: { password: 'right-password' } })).status, 429, 'even the right password waits')
  const logins = []
  for (let i = 0; i < 12; i++) logins.push((await b.req(`${ORIGIN.app}/api/session`, { method: 'POST', shell: true, headers: ip, json: { email: 'nobody@example.test', password: `wrong-${i}` } })).status)
  assert.deepEqual([logins[0], logins.at(-1)], [401, 429])
})

test('shares, invitations, effective role, revocation, resets', async () => {
  const a = await create('shared')
  const mail = app.mail.messages
  const inv = await api('PUT', 'artifacts/shared/shares', { email: 'Ana@Example.test', role: 'viewer', alias: 'Ana' })
  assert.equal(inv.status, 200, inv.text)
  assert.equal(inv.body.invited, true)
  const msg = await mailTo(app.mail, (m) => m.to.includes('ana@example.test'))
  const link = msg.links.find((l) => l.includes('/invite/'))
  assert.ok(link, msg.text)

  const ana = new Browser()
  const set = await acceptInvite(ana, link, 'ana-password-1')
  assert.equal(set.status, 303)
  assert.equal(set.headers.get('location'), '/shared')
  const page = await ana.open('shared')
  assert.equal(page.boot.role, 'viewer')
  assert.equal(page.boot.user, 'Ana')
  assert.equal((await new Browser().req(link)).status, 410, 'invitation links are single use')

  // A viewer sees state but cannot write it.
  assert.equal((await ana.req(`${ORIGIN.app}/api/a/${a.id}/state`, { shell: true })).status, 200)
  assert.equal((await ana.req(`${ORIGIN.app}/api/a/${a.id}/state`, { method: 'PUT', shell: true, json: { state: 1 } })).status, 403)
  assert.equal((await ana.req(`${ORIGIN.app}/api/a/${a.id}/state/history`, { shell: true })).status, 403)

  // The higher of share and general access wins.
  await setAccess('shared', { kind: 'link', role: 'editor' })
  assert.equal((await ana.open('shared')).boot.role, 'editor')
  await setAccess('shared', { kind: 'restricted' })

  // Writes need the session's CSRF token and the app Origin.
  ana.csrf = 'wrong'
  await api('PUT', 'artifacts/shared/shares', { email: 'ana@example.test', role: 'editor' })
  assert.equal((await ana.req(`${ORIGIN.app}/api/a/${a.id}/state`, { method: 'PUT', shell: true, json: { state: 1 } })).status, 403)
  const fresh = await ana.open('shared')
  assert.equal(fresh.boot.role, 'editor')
  assert.equal((await ana.req(`${ORIGIN.app}/api/a/${a.id}/state`, { method: 'PUT', json: { state: 1 }, headers: { 'x-artifact-shell': '1', origin: 'https://evil.example', 'x-artifact-csrf': ana.csrf } })).status, 403)
  assert.equal((await ana.req(`${ORIGIN.app}/api/a/${a.id}/state`, { method: 'PUT', json: { state: 1 }, headers: { origin: ORIGIN.app, 'x-artifact-csrf': ana.csrf } })).status, 403)

  // The same account opens a second artifact shared with it, with no new credentials; the invitation links straight to it.
  await create('shared-two')
  await api('PUT', 'artifacts/shared-two/shares', { email: 'ana@example.test', role: 'responder' })
  const second = await mailTo(app.mail, (m) => m.to.includes('ana@example.test') && m.links.some((l) => l.endsWith('/shared-two')))
  assert.ok(!second.links.some((l) => l.includes('/invite/')))
  assert.equal((await ana.open('shared-two')).boot.role, 'responder')

  // Removing the share ends access at once, including the content link already in the page.
  assert.equal((await api('DELETE', 'artifacts/shared/shares/ana@example.test')).status, 200)
  assert.equal((await ana.open('shared')).boot.role, null)
  assert.equal((await ana.req(fresh.iframe)).status, 403)

  const shares = await api('GET', 'artifacts/shared-two/shares')
  assert.deepEqual(shares.body.map((s) => [s.email, s.role]), [['ana@example.test', 'responder']])
  const accounts = await api('GET', 'accounts')
  assert.deepEqual(accounts.body.find((x) => x.email === 'ana@example.test').shares.map((s) => s.slug), ['shared-two'])

  // Forgot password by email.
  const forgot = await new Browser().req(`${ORIGIN.app}/api/password/forgot`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: ORIGIN.app }, body: 'email=ana%40example.test',
  })
  assert.equal(forgot.status, 200)
  const reset = await mailTo(app.mail, (m) => m.to.includes('ana@example.test') && m.links.some((l) => l.includes('/reset/')))
  const ana2 = new Browser()
  assert.equal((await acceptInvite(ana2, reset.links.find((l) => l.includes('/reset/')), 'ana-password-2')).status, 303)
  assert.equal((await ana.open('shared-two')).boot.role, null, 'a reset ends older sessions')
  assert.equal((await new Browser().signIn('ana@example.test', 'ana-password-1')).status, 401)
  assert.equal((await new Browser().signIn('ana@example.test', 'ana-password-2')).status, 200)

  // Owner reset without email returns a password once and ends sessions.
  const ownerReset = await api('POST', 'accounts/ana@example.test/reset', { notify: false })
  assert.ok(ownerReset.body.password)
  assert.equal((await ana2.open('shared-two')).boot.role, null)
  const ana3 = new Browser()
  assert.equal((await ana3.signIn('ana@example.test', ownerReset.body.password)).status, 200)
  assert.equal((await ana3.open('shared-two')).boot.role, 'responder')

  // Share without email: a new account gets a generated password once.
  const quiet = await api('PUT', 'artifacts/shared-two/shares', { email: 'bob@example.test', role: 'editor', notify: false })
  assert.ok(quiet.body.password)
  assert.ok(!mail.some((m) => m.to.includes('bob@example.test')))
  const bob = new Browser()
  assert.equal((await bob.signIn('bob@example.test', quiet.body.password)).status, 200)
  assert.equal((await bob.open('shared-two')).boot.role, 'editor')
  assert.equal((await api('POST', 'artifacts/shared-two/shares/bob@example.test/resend')).status, 200)
  await mailTo(app.mail, (m) => m.to.includes('bob@example.test'))

  // Deleting an account removes access everywhere.
  assert.equal((await api('DELETE', 'accounts/bob@example.test')).status, 200)
  assert.equal((await bob.open('shared-two')).boot.role, null)

  // Sign out.
  await ana3.req(`${ORIGIN.app}/api/session`, { method: 'DELETE', shell: true })
  assert.equal((await ana3.open('shared-two')).boot.role, null)
})

test('state: optimistic conflict, history, revisions', async () => {
  const a = await create('state', { access: { kind: 'link', role: 'editor' } })
  const b = new Browser()
  await b.open('state')
  const s1 = await b.req(`${ORIGIN.app}/api/a/${a.id}/state`, { method: 'PUT', shell: true, json: { state: { n: 1 }, baseRev: 0 } })
  assert.equal(s1.body.rev, 1)
  const conflict = await b.req(`${ORIGIN.app}/api/a/${a.id}/state`, { method: 'PUT', shell: true, json: { state: { n: 2 }, baseRev: 0 } })
  assert.equal(conflict.status, 409)
  assert.equal(conflict.body.error.currentRev, 1)
  await b.req(`${ORIGIN.app}/api/a/${a.id}/state`, { method: 'PUT', shell: true, json: { state: { n: 2 }, baseRev: 1 } })
  const hist = await b.req(`${ORIGIN.app}/api/a/${a.id}/state/history`, { shell: true })
  assert.deepEqual(hist.body.map((h) => h.rev), [2, 1])
  assert.deepEqual((await b.req(`${ORIGIN.app}/api/a/${a.id}/state?rev=1`, { shell: true })).body.state, { n: 1 })
  assert.deepEqual((await api('GET', 'artifacts/state/state')).body.state, { n: 2 })
  assert.equal((await api('PUT', 'artifacts/state/state', { state: { seeded: true }, baseRev: 2 })).body.rev, 3)
})

test('responses in three identity modes, privacy, grading, regrade, export, notifications and copies', async () => {
  const a = await create('quiz', { access: { kind: 'link', role: 'responder' } })
  const settings = async (responses) => { const r = await api('PATCH', 'artifacts/quiz', { responses }); assert.equal(r.status, 200, r.text) }
  await settings({ who: 'anonymous', feedback: 'answers', notifyOwner: true })
  const key = { q1: { answer: 'b' }, q2: { answer: ['a', 'c'], points: 2 }, q3: { answer: 'Buenos Aires' } }
  assert.equal((await api('PUT', 'artifacts/quiz/answer-key', { key })).status, 200)

  // Anonymous: keyed by a browser cookie, reopened and corrected.
  const x = new Browser()
  await x.open('quiz')
  const sub = await x.req(`${ORIGIN.app}/api/a/${a.id}/response`, { method: 'PUT', shell: true, json: { answers: { q1: 'b', q2: ['c', 'a'], q3: ' buenos  aires ' } } })
  assert.equal(sub.status, 200, sub.text)
  assert.equal(sub.body.response.score, 4)
  assert.equal(sub.body.response.maxScore, 4)
  assert.deepEqual(sub.body.response.correct, { q1: 'b', q2: ['a', 'c'], q3: 'Buenos Aires' })
  await mailTo(app.mail, (m) => m.to.includes(OWNER_INBOX) && /quiz/.test(m.subject))
  const fix = await x.req(`${ORIGIN.app}/api/a/${a.id}/response`, { method: 'PUT', shell: true, json: { answers: { q1: 'a', q2: ['a', 'c'], q3: 'x' } } })
  // A graded response that shows its result is final, or resubmitting would reveal the key one question at a time.
  assert.equal(fix.status, 409)
  // A responder answers but never writes the shared state.
  assert.equal((await x.req(`${ORIGIN.app}/api/a/${a.id}/state`, { method: 'PUT', shell: true, json: { state: 1 } })).status, 403)
  assert.deepEqual((await x.req(`${ORIGIN.app}/api/a/${a.id}/response`, { shell: true })).body.response.answers.q1, 'b')

  // Another responder sees only their own (nothing yet), never the first one's.
  const y = new Browser()
  await y.open('quiz')
  assert.equal((await y.req(`${ORIGIN.app}/api/a/${a.id}/response`, { shell: true })).body.response, null)
  await y.req(`${ORIGIN.app}/api/a/${a.id}/response`, { method: 'PUT', shell: true, json: { answers: { q1: 'b' } } })
  assert.deepEqual((await y.req(`${ORIGIN.app}/api/a/${a.id}/response`, { shell: true })).body.response.answers, { q1: 'b' })

  // Score only: no correct answers. Nobody but the owner can read the key.
  await settings({ feedback: 'score' })
  const scored = (await y.req(`${ORIGIN.app}/api/a/${a.id}/response`, { shell: true })).body.response
  assert.equal(scored.score, 1)
  assert.equal(scored.correct, undefined)
  await settings({ feedback: 'none' })
  assert.equal((await y.req(`${ORIGIN.app}/api/a/${a.id}/response`, { shell: true })).body.response.score, undefined)
  // With no result shown, a response can be corrected until responses close.
  assert.equal((await y.req(`${ORIGIN.app}/api/a/${a.id}/response`, { method: 'PUT', shell: true, json: { answers: { q1: 'b', q3: 'x' } } })).status, 200)
  assert.equal((await y.req(`${ORIGIN.app}/api/a/${a.id}/response`, { shell: true })).body.response.answers.q3, 'x')
  for (const p of ['answer-key', 'answerKey', 'key']) assert.equal((await y.req(`${ORIGIN.app}/api/a/${a.id}/${p}`, { shell: true })).status, 404)
  const info = await y.req(`${ORIGIN.app}/api/a/${a.id}/info`, { shell: true })
  assert.doesNotMatch(info.text + (await y.req((await y.open('quiz')).iframe)).text, /Buenos Aires/)
  assert.equal((await api('GET', 'artifacts/quiz/answer-key')).body.key.q3.answer, 'Buenos Aires')

  // A viewer cannot respond.
  await setAccess('quiz', { kind: 'link', role: 'viewer' })
  const v = new Browser()
  await v.open('quiz')
  assert.equal((await v.req(`${ORIGIN.app}/api/a/${a.id}/response`, { method: 'PUT', shell: true, json: { answers: { q1: 'b' } } })).status, 403)
  await setAccess('quiz', { kind: 'link', role: 'responder' })

  // Declared identity: a name or email is required; an email gets a copy.
  await settings({ who: 'declared' })
  const d = new Browser()
  await d.open('quiz')
  assert.equal((await d.req(`${ORIGIN.app}/api/a/${a.id}/response`, { method: 'PUT', shell: true, json: { answers: { q1: 'b' } } })).status, 400)
  assert.equal((await d.req(`${ORIGIN.app}/api/a/${a.id}/response`, { method: 'PUT', shell: true, json: { answers: { q1: 'a', q3: 'visit evil.example' }, name: 'Caro', email: 'caro@example.test' } })).status, 200)
  // A typed address is unverified: it gets a fixed receipt, never the submitted text.
  const copy = await mailTo(app.mail, (m) => m.to.includes('caro@example.test'))
  assert.match(copy.text, /Recibimos tu respuesta/)
  assert.doesNotMatch(copy.text, /evil\.example/)

  // Accounts only: one response per account across browsers.
  await settings({ who: 'account' })
  const anon = new Browser()
  await anon.open('quiz')
  assert.equal((await anon.req(`${ORIGIN.app}/api/a/${a.id}/response`, { method: 'PUT', shell: true, json: { answers: { q1: 'b' } } })).status, 401)
  const pw = (await api('PUT', 'artifacts/quiz/shares', { email: 'dan@example.test', role: 'responder', notify: false })).body.password
  for (const answer of ['a', 'b']) {
    const dan = new Browser()
    await dan.signIn('dan@example.test', pw)
    await dan.open('quiz')
    assert.equal((await dan.req(`${ORIGIN.app}/api/a/${a.id}/response`, { method: 'PUT', shell: true, json: { answers: { q1: answer } } })).status, 200)
  }
  // An account's own address gets its answers back.
  assert.match((await mailTo(app.mail, (m) => m.to.includes('dan@example.test') && /Tu respuesta/.test(m.subject))).text, /"q1"/)

  // Closed responses refuse submissions but still show your own.
  await settings({ open: false })
  const dan = new Browser()
  await dan.signIn('dan@example.test', pw)
  await dan.open('quiz')
  assert.equal((await dan.req(`${ORIGIN.app}/api/a/${a.id}/response`, { method: 'PUT', shell: true, json: { answers: { q1: 'c' } } })).status, 409)
  assert.equal((await dan.req(`${ORIGIN.app}/api/a/${a.id}/response`, { shell: true })).body.response.answers.q1, 'b')
  await settings({ open: true })

  // The owner reads everything, regrades by replacing the key, exports and deletes.
  let list = (await api('GET', 'artifacts/quiz/responses')).body
  assert.equal(list.length, 4)
  assert.deepEqual(list.map((r) => r.identity).sort(), ['account', 'browser', 'browser', 'browser'])
  assert.equal(list.find((r) => r.email === 'dan@example.test').score, 1)
  assert.equal((await api('PUT', 'artifacts/quiz/answer-key', { key: { q1: { answer: 'a', points: 5 } } })).body.regraded, 4)
  list = (await api('GET', 'artifacts/quiz/responses')).body
  assert.equal(list.find((r) => r.email === 'dan@example.test').score, 0)
  assert.equal(list.find((r) => r.name === 'Caro').score, 5)
  const csv = await api('GET', 'artifacts/quiz/responses?format=csv')
  assert.match(csv.headers.get('content-type'), /text\/csv/)
  assert.match(csv.text.split('\r\n')[0], /"id","submittedAt","updatedAt","identity","name","email","alias","score","maxScore","q1"/)
  assert.equal((await api('DELETE', `artifacts/quiz/responses/${list[0].id}`)).status, 200)
  assert.equal((await api('GET', 'artifacts/quiz/responses')).body.length, 3)
})

test('files: inline publish, versions, rollback, range requests, capability expiry and epoch', async () => {
  const bytes = crypto.randomBytes(300000)
  const a = await create('files', { access: { kind: 'link', role: 'viewer' }, files: [{ path: 'img/data.bin', base64: bytes.toString('base64') }] })
  const b = new Browser()
  const page = await b.open('files')
  const full = await b.req(`${page.base}img/data.bin`)
  assert.equal(full.status, 200)
  assert.ok(full.buf.equals(bytes))
  const part = await b.req(`${page.base}img/data.bin`, { headers: { range: 'bytes=100-199' } })
  assert.equal(part.status, 206)
  assert.equal(part.headers.get('content-range'), `bytes 100-199/${bytes.length}`)
  assert.ok(part.buf.equals(bytes.subarray(100, 200)))
  const head = await b.req(`${page.base}img/data.bin`, { method: 'HEAD' })
  // Next 16.4.6 drops Content-Length from a bodiless HEAD response; seeking uses the ranged GET asserted above.
  assert.equal(head.status, 200)
  assert.equal(head.headers.get('accept-ranges'), 'bytes')

  const v2 = await api('POST', 'artifacts/files/versions', { html: html('second'), removeFiles: ['img/data.bin'], note: 'v2' })
  assert.equal(v2.body.version, 2)
  assert.deepEqual(v2.body.files.map((f) => f.path), ['index.html'])
  assert.match((await b.req((await b.open('files')).iframe)).text, /second/)
  assert.match((await b.req(page.iframe)).text, /T files/, 'an issued link keeps serving its own version')
  const rb = await api('POST', 'artifacts/files/rollback', { version: 1 })
  assert.equal(rb.body.version, 3)
  assert.deepEqual(rb.body.files.map((f) => f.path), ['img/data.bin', 'index.html'])

  // Tampered and expired capabilities are refused.
  const cap = /\/c\/([^/]+)\//.exec(page.iframe)[1]
  const tampered = cap.replace(/\.(\d+)\.(\d+)\.(\d+)\./, (m, v) => m.replace(`.${v}.`, `.${Number(v) + 1}.`))
  assert.equal((await b.req(`${ORIGIN.content}/c/${tampered}/index.html`)).status, 403)
  const { rows: [{ value: secret }] } = await services.pool.query("SELECT value FROM artifacts.settings WHERE key = 'content_secret'")
  const body = `${a.id}.1.${cap.split('.')[2]}.${Math.floor(Date.now() / 1000) - 5}`
  const expired = `${body}.${crypto.createHmac('sha256', secret).update(body).digest('base64url')}`
  assert.equal((await b.req(`${ORIGIN.content}/c/${expired}/index.html`)).status, 403)

  // Agent file operations.
  assert.equal((await api('GET', 'artifacts/files/files/index.html')).status, 200)
  const put = await b.req(`${ORIGIN.app}/api/v1/artifacts/files/files/notes.txt`, { method: 'PUT', body: 'hello', headers: { authorization: `Bearer ${token}`, 'content-type': 'text/plain' } })
  assert.equal(put.status, 201)
  assert.equal((await api('DELETE', 'artifacts/files/files/notes.txt')).status, 200)
  assert.equal((await api('DELETE', 'artifacts/files/files/index.html')).status, 400)
  assert.equal((await api('PATCH', 'artifacts/files', { slug: 'files-renamed', title: 'Renamed' })).body.url, `${ORIGIN.app}/files-renamed`)
  assert.equal((await new Browser().open('files-renamed')).boot.title, 'Renamed')
})

test('multipart upload resumes, and the storage cap refuses before any part', async () => {
  await create('upload', { access: { kind: 'link', role: 'viewer' } })
  const size = (16 << 20) + 12345
  const data = crypto.randomBytes(size)
  const start = await api('POST', 'artifacts/upload/uploads', { path: 'big/file.bin', size, fingerprint: 'fp-1', sha256: crypto.createHash('sha256').update(data).digest('hex') })
  assert.equal(start.status, 201, start.text)
  assert.equal(start.body.partCount, 2)
  const partUrl = (n) => `${ORIGIN.app}/api/v1/uploads/${start.body.id}/parts/${n}`
  const b = new Browser()
  const put = (n, buf) => b.req(partUrl(n), { method: 'PUT', body: buf, headers: { authorization: `Bearer ${token}` } })
  const p2 = await put(2, data.subarray(start.body.partSize))
  assert.equal(p2.status, 200, p2.text)
  assert.equal((await put(1, data.subarray(0, 10))).status, 400, 'a short part is refused')
  assert.equal((await api('POST', `uploads/${start.body.id}/complete`, {})).status, 409)
  // "Interrupted": starting again with the same fingerprint resumes the same upload.
  const again = await api('POST', 'artifacts/upload/uploads', { path: 'big/file.bin', size, fingerprint: 'fp-1', sha256: crypto.createHash('sha256').update(data).digest('hex') })
  assert.equal(again.body.id, start.body.id)
  assert.equal(again.body.resumed, true)
  assert.deepEqual(again.body.received, [2])
  assert.equal((await put(1, data.subarray(0, start.body.partSize))).status, 200)
  const done = await api('POST', `uploads/${start.body.id}/complete`, {})
  assert.equal(done.status, 201, done.text)
  assert.ok(done.body.files.some((f) => f.path === 'big/file.bin' && f.size === size))
  const page = await new Browser().open('upload')
  const tail = await new Browser().req(`${page.base}big/file.bin`, { headers: { range: `bytes=${size - 100}-` } })
  assert.equal(tail.status, 206)
  assert.ok(tail.buf.equals(data.subarray(size - 100)))

  // Storage per artifact and in total.
  const storage = await api('GET', 'storage')
  assert.ok(storage.body.usedBytes >= size)
  assert.equal(storage.body.capBytes, CAP)
  assert.ok(storage.body.artifacts.find((x) => x.slug === 'upload').storageBytes >= size)
  const over = await api('POST', 'artifacts/upload/uploads', { path: 'huge.bin', size: CAP, sha256: emptySha })
  assert.equal(over.status, 507)
  assert.match(over.body.error.message, /storage is full/i)
  assert.equal((await api('POST', 'artifacts/upload/uploads', { path: 'x.bin', size: 2 ** 30 + 1, sha256: emptySha })).status, 400)

  // Deleting the artifact frees its storage, including an upload still in progress.
  const pending = await api('POST', 'artifacts/upload/uploads', { path: 'pending.bin', size: 1000, sha256: emptySha })
  assert.equal(pending.status, 201)
  await api('DELETE', 'artifacts/upload')
  assert.equal((await api('GET', `uploads/${pending.body.id}`)).status, 404)
  assert.ok((await api('GET', 'storage')).body.usedBytes < storage.body.usedBytes - size + 1)
})

test('a video upload is pending until encoded, and the client can see it', async () => {
  const a = await create('video', { access: { kind: 'link', role: 'viewer' }, files: [{ path: 'talk.mp4', base64: crypto.randomBytes(2048).toString('base64') }] })
  const d = await api('GET', 'artifacts/video')
  assert.equal(d.body.files.find((f) => f.path === 'talk.mp4').video, 'pending')
  const b = new Browser()
  const page = await b.open('video')
  assert.deepEqual((await b.req(`${ORIGIN.app}/api/a/${a.id}/video?path=talk.mp4`, { shell: true })).body, { status: 'pending' })
  assert.equal((await b.req(`${page.base}talk.mp4`)).status, 409)
  assert.equal((await b.req(`${page.base}talk.mp4/hls/master.m3u8`)).status, 404)
  assert.equal((await api('GET', 'artifacts/video/files/talk.mp4')).status, 409)
})

test('an encoded video is served as HLS behind the capability, with the player script', { timeout: 240000 }, async () => {
  const IMAGE = process.env.ARTIFACTS_ENCODER_IMAGE || 'portfolio-invoice-notes:20261102'
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-hls-'))
  fs.chmodSync(dir, 0o777)
  try {
    await run('docker', ['run', '--rm', '-v', `${dir}:/w`, '--entrypoint', 'ffmpeg', IMAGE, '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=24', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '/w/clip.mp4'])
    const clip = fs.readFileSync(path.join(dir, 'clip.mp4'))
    const a = await create('hls', { access: { kind: 'link', role: 'viewer' }, files: [{ path: 'media/clip.mp4', base64: clip.toString('base64') }] })
    const env = { DATABASE_URL: process.env.DATABASE_URL, REDIS_URL: process.env.REDIS_URL, ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('ARTIFACTS_S3_'))) }
    await run('docker', ['run', '--rm', '--network', 'host', '-v', `${ROOT}:/w:ro`, ...Object.entries(env).flatMap(([k, v]) => ['-e', `${k}=${v}`]),
      '--entrypoint', 'node', IMAGE, '/w/scripts/artifacts-encoder.mjs', '--once'])
    const b = new Browser()
    const page = await b.open('hls')
    assert.deepEqual((await b.req(`${ORIGIN.app}/api/a/${a.id}/video?path=media/clip.mp4`, { shell: true })).body, { status: 'ready' })
    const direct = await b.req(`${page.base}media/clip.mp4`)
    assert.equal(direct.status, 302)
    assert.match(direct.headers.get('location'), /\/media\/clip\.mp4\/hls\/master\.m3u8$/)
    const master = await b.req(`${page.base}media/clip.mp4/hls/master.m3u8`)
    assert.equal(master.headers.get('content-type'), 'application/vnd.apple.mpegurl')
    assert.equal(master.headers.get('access-control-allow-origin'), '*')
    assert.match(master.text, /360\/index\.m3u8/)
    const playlist = await b.req(`${page.base}media/clip.mp4/hls/360/index.m3u8`)
    const seg = playlist.text.split('\n').find((l) => l.startsWith('seg_'))
    const ranged = await b.req(`${page.base}media/clip.mp4/hls/360/${seg}`, { headers: { range: 'bytes=0-187' } })
    assert.equal(ranged.status, 206)
    assert.equal(ranged.buf[0], 0x47)
    assert.equal((await b.req(`${page.base}media/clip.mp4/hls/poster.jpg`)).headers.get('content-type'), 'image/jpeg')
    // Tightening access kills the HLS URLs too.
    await setAccess('hls', { kind: 'restricted' })
    assert.equal((await b.req(`${page.base}media/clip.mp4/hls/master.m3u8`)).status, 403)
    const player = await b.req(`${ORIGIN.content}/_/hls.js`)
    assert.equal(player.status, 200)
    assert.match(player.text, /Hls/)
  } finally {
    await run('docker', ['run', '--rm', '-v', `${dir}:/w`, '--entrypoint', 'sh', IMAGE, '-c', 'rm -rf /w/*']).catch(() => {})
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('agent API authentication and token revocation', async () => {
  const anon = new Browser()
  assert.equal((await anon.req(`${ORIGIN.app}/api/v1/artifacts`)).status, 401)
  assert.equal((await anon.req(`${ORIGIN.app}/api/v1/artifacts`, { headers: { authorization: 'Bearer nope' } })).status, 401)
  const asOwner = (method, path, json) => owner.req(`${ORIGIN.app}/api/v1/${path}`, { method, json, headers: { origin: ORIGIN.app } })
  // A token cannot manage tokens: a leaked one must not mint a successor.
  assert.equal((await api('POST', 'tokens', { name: 'sneaky' })).status, 403)
  assert.equal((await api('GET', 'tokens')).status, 403)
  const t = await asOwner('POST', 'tokens', { name: 'short-lived' })
  const temp = agent(t.body.token)
  assert.equal((await temp('GET', 'artifacts')).status, 200)
  assert.equal((await asOwner('DELETE', `tokens/${t.body.id}`)).status, 200)
  assert.equal((await temp('GET', 'artifacts')).status, 401)
  // A limited token reaches only the restricted artifacts it created, and cannot share, open or delete them.
  const lim = agent((await asOwner('POST', 'tokens', { name: 'crm', limited: true })).body.token)
  const theirs = (await api('POST', 'artifacts', { title: 'Not the CRMs', html: '<p>x</p>' })).body
  const mine = await lim('POST', 'artifacts', { title: 'CRM page', html: '<p>crm</p>' })
  assert.equal(mine.status, 201, mine.text)
  assert.equal(mine.body.access.kind, 'restricted')
  assert.deepEqual((await lim('GET', 'artifacts')).body.map((x) => x.slug), [mine.body.slug])
  assert.equal((await lim('POST', `artifacts/${mine.body.slug}/versions`, { html: '<p>v2</p>' })).status, 201)
  assert.equal((await lim('GET', `artifacts/${theirs.slug}`)).status, 404)
  assert.equal((await lim('POST', `artifacts/${theirs.slug}/versions`, { html: '<p>no</p>' })).status, 404)
  assert.equal((await lim('POST', 'artifacts', { title: 'Open', html: '<p>x</p>', access: { kind: 'link' } })).status, 403)
  assert.equal((await lim('PUT', `artifacts/${mine.body.slug}/access`, { kind: 'link' })).status, 403)
  assert.equal((await lim('PUT', `artifacts/${mine.body.slug}/shares`, { email: 'x@example.test', role: 'viewer', notify: false })).status, 403)
  assert.equal((await lim('DELETE', `artifacts/${mine.body.slug}`)).status, 403)
  for (const p of ['storage', 'accounts', 'tokens']) assert.equal((await lim('GET', p)).status, 403)
  // Once the owner opens it, it is out of the limited token's reach.
  assert.equal((await api('PUT', `artifacts/${mine.body.slug}/access`, { kind: 'link', role: 'viewer' })).status, 200)
  assert.equal((await lim('GET', `artifacts/${mine.body.slug}`)).status, 404)
  assert.deepEqual((await lim('GET', 'artifacts')).body, [])
  const list = await asOwner('GET', 'tokens')
  assert.ok(list.body.every((x) => !('token' in x) && !('token_hash' in x)))
  // The console door on the main origin needs the admin session.
  assert.equal((await anon.req(`${ORIGIN.main}/api/admin/artifacts/artifacts`)).status, 401)
  // The guest API refuses requests without the shell header (what a cross-origin page could send without a preflight).
  const a = await create('guest-api', { access: { kind: 'link', role: 'editor' } })
  assert.equal((await anon.req(`${ORIGIN.app}/api/a/${a.id}/state`)).status, 403)
  const pre = await anon.req(`${ORIGIN.app}/api/a/${a.id}/state`, { method: 'OPTIONS', headers: { origin: 'null', 'access-control-request-method': 'PUT', 'access-control-request-headers': 'x-artifact-shell' } })
  assert.equal(pre.headers.get('access-control-allow-origin'), null)
  // Artifact paths on the main origin are not served.
  assert.equal((await anon.req(`${ORIGIN.main}/artifacts-app/guest-api`)).status, 404)
})

test('CLI publishes a folder with a large file, shares, reads state, exports responses', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-cli-'))
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-cli-home-'))
  try {
    fs.writeFileSync(path.join(dir, 'index.html'), html('cli deck'))
    fs.mkdirSync(path.join(dir, 'media'))
    const big = crypto.randomBytes((6 << 20) + 7)
    fs.writeFileSync(path.join(dir, 'media/big.bin'), big)
    fs.mkdirSync(path.join(home, '.config/artifacts'), { recursive: true })
    fs.writeFileSync(path.join(home, '.config/artifacts/token'), token, { mode: 0o600 })
    const env = { ...process.env, HOME: home, ARTIFACTS_URL: ORIGIN.app }
    const cli = async (...args) => JSON.parse((await run(process.execPath, [path.join(ROOT, 'scripts/artifacts.mjs'), ...args], { env, maxBuffer: 1 << 24 })).stdout)
    const pub = await cli('publish', dir, '--slug', 'cli-deck', '--title', 'CLI deck')
    assert.equal(pub.url, `${ORIGIN.app}/cli-deck`)
    assert.deepEqual(pub.files.map((f) => f.path), ['index.html', 'media/big.bin'])
    fs.writeFileSync(path.join(dir, 'index.html'), html('cli deck v2'))
    const pub2 = await cli('publish', dir, '--slug', 'cli-deck')
    assert.equal(pub2.version, pub.version + 1)
    assert.equal((await cli('access', 'cli-deck', 'link', '--role', 'viewer')).access.kind, 'link')
    const page = await new Browser().open('cli-deck')
    assert.ok((await new Browser().req(`${page.base}media/big.bin`)).buf.equals(big))
    assert.equal((await cli('share', 'cli-deck', 'eve@example.test', 'editor', '--no-email')).role, 'editor')
    assert.equal((await cli('state', 'put', 'cli-deck', '--json', '{"x":1}')).rev, 1)
    assert.deepEqual((await cli('state', 'get', 'cli-deck')).state, { x: 1 })
    assert.equal((await cli('state', 'history', 'cli-deck')).items.length, 1)
    assert.deepEqual(await cli('responses', 'export', 'cli-deck'), { url: `${ORIGIN.app}/cli-deck`, items: [] })
    assert.equal((await cli('rollback', 'cli-deck', '1')).version, pub2.version + 1)
    const listed = await cli('list')
    assert.ok(listed.some((x) => x.slug === 'cli-deck' && x.url))
    fs.chmodSync(path.join(home, '.config/artifacts/token'), 0o644)
    await assert.rejects(run(process.execPath, [path.join(ROOT, 'scripts/artifacts.mjs'), 'list'], { env }), /mode 600/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('MCP endpoint lists and calls tools with the API token', async () => {
  const b = new Browser()
  const rpc = (body, auth = true) => b.req(`${ORIGIN.app}/mcp`, { method: 'POST', json: body, headers: { accept: 'application/json, text/event-stream', ...(auth ? { authorization: `Bearer ${token}` } : {}) } })
  assert.equal((await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }, false)).status, 401)
  const init = await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } })
  assert.equal(init.body.result.serverInfo.name, 'artifacts')
  assert.equal((await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' })).status, 202)
  const tools = (await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' })).body.result.tools
  assert.ok(tools.some((t) => t.name === 'create_artifact'))
  assert.ok(!tools.some((t) => /upload/.test(t.name)))
  const created = await rpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'create_artifact', arguments: { title: 'Via MCP', slug: 'via-mcp', html: html('mcp') } } })
  assert.equal(created.body.result.isError, false, created.text)
  assert.equal(JSON.parse(created.body.result.content[0].text).url, `${ORIGIN.app}/via-mcp`)
  const shared = await rpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'share_artifact', arguments: { ref: 'via-mcp', email: 'fay@example.test', role: 'viewer', notify: false } } })
  assert.equal(JSON.parse(shared.body.result.content[0].text).role, 'viewer')
  const bad = await rpc({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'get_artifact', arguments: { ref: 'nope-nope' } } })
  assert.equal(bad.body.result.isError, true)
})
