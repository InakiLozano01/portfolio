// Seam A, accounts and responses: invitation and reset links, sign-in and unlock limits, response identity and emails,
// the state history cap and MCP token limits, over HTTP against the throwaway stack.
// Run: NEXT_DIST_DIR=.next-test npx next build && node --test --test-concurrency=1 tests/artifacts/accounts.test.mjs
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN, Browser, OWNER_INBOX, ORIGIN, agent, mailTo, removeContainers, startApp, startServices } from './stack.mjs'

let services, app, api, owner
const html = (title) => `<!doctype html><html><head><title>${title}</title></head><body><h1>${title}</h1></body></html>`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let nextIp = 1
const freshIp = () => ({ 'cf-connecting-ip': `198.51.100.${nextIp++}` }) // its own rate-limit budget

before(async () => {
  services = await startServices()
  app = await startApp()
  owner = new Browser()
  assert.equal((await owner.signIn(ADMIN.email, ADMIN.password)).status, 200)
  api = agent((await asOwner('POST', 'tokens', { name: 'accounts-test' })).body.token)
}, { timeout: 180000 })

after(async () => {
  await app?.stop()
  await services?.pool.end()
  removeContainers()
})

const asOwner = (method, p, json) => owner.req(`${ORIGIN.app}/api/v1/${p}`, { method, json, headers: { origin: ORIGIN.app } })
async function create(slug, extra = {}) {
  const r = await api('POST', 'artifacts', { title: `T ${slug}`, slug, html: html(`T ${slug}`), ...extra })
  assert.equal(r.status, 201, r.text)
  return r.body
}
const settings = async (slug, responses) => assert.equal((await api('PATCH', `artifacts/${slug}`, { responses })).status, 200)
const form = (b, p, fields, headers = {}) => b.req(`${ORIGIN.app}/api/${p}`, {
  method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: ORIGIN.app, ...headers }, body: new URLSearchParams(fields).toString(),
})
const tokenOf = (link) => link.split('/').at(-1)
const setPassword = (link, password) => form(new Browser(), 'password/set', { token: tokenOf(link), password })
const forgot = (email, headers = freshIp()) => form(new Browser(), 'password/forgot', { email }, headers)
const mailsTo = (addr, re = /./) => app.mail.messages.filter((m) => m.to.includes(addr) && re.test(m.subject + m.text))
const linkIn = (m, kind) => m.links.find((l) => l.includes(`/${kind}/`))
/** The newest mail to `addr` carrying a `kind` link that is not one of `seen`. */
async function newLink(addr, kind, seen = []) {
  const m = await mailTo(app.mail, (x) => x.to.includes(addr) && linkIn(x, kind) && !seen.includes(linkIn(x, kind)))
  return linkIn(m, kind)
}
const respond = (b, a, json) => b.req(`${ORIGIN.app}/api/a/${a.id}/response`, { method: 'PUT', shell: true, json })

// ---------- ticket 06: invitation and reset links ----------

test('using any invitation or reset link, or an owner reset, ends every other link for that account', async () => {
  await create('links')
  assert.equal((await api('PUT', 'artifacts/links/shares', { email: 'lia@example.test', role: 'viewer' })).body.invited, true)
  const inv1 = await newLink('lia@example.test', 'invite')
  await api('POST', 'artifacts/links/shares/lia@example.test/resend')
  const inv2 = await newLink('lia@example.test', 'invite', [inv1])
  assert.equal((await setPassword(inv2, 'lia-password-1')).status, 303)
  assert.equal((await setPassword(inv1, 'someone-else-1')).status, 410, 'the older invitation died with the newer one')
  assert.equal((await new Browser().signIn('lia@example.test', 'lia-password-1')).status, 200)

  assert.equal((await forgot('lia@example.test')).status, 200)
  const r1 = await newLink('lia@example.test', 'reset')
  assert.equal((await forgot('lia@example.test')).status, 200)
  const r2 = await newLink('lia@example.test', 'reset', [r1])
  assert.equal((await setPassword(r1, 'lia-password-2')).status, 303)
  assert.equal((await setPassword(r1, 'lia-password-3')).status, 410, 'a reset link is single use')
  assert.equal((await setPassword(r2, 'lia-password-3')).status, 410, 'the other reset link died too')
  assert.equal((await new Browser().signIn('lia@example.test', 'lia-password-2')).status, 200)

  assert.equal((await forgot('lia@example.test')).status, 200)
  const r3 = await newLink('lia@example.test', 'reset', [r1, r2])
  assert.ok((await api('POST', 'accounts/lia@example.test/reset', { notify: false })).body.password)
  assert.equal((await setPassword(r3, 'lia-password-4')).status, 410, 'an owner reset ends outstanding links')
})

test('an invitation link lasts 7 days and a reset link 1 hour', async () => {
  // Moving the stored expiry back stands in for the clock moving forward.
  const age = (email, interval) => services.pool.query(
    "UPDATE artifacts.tokens SET expires_at = expires_at - $2::interval WHERE account_id = (SELECT id FROM artifacts.accounts WHERE email = $1)", [email, interval])
  const alive = async (link) => (await new Browser().req(link)).status
  await create('expiry')
  await api('PUT', 'artifacts/expiry/shares', { email: 'mo@example.test', role: 'viewer' })
  const inv = await newLink('mo@example.test', 'invite')
  await age('mo@example.test', '7 days -1 minute')
  assert.equal(await alive(inv), 200, 'still valid a minute before 7 days')
  await age('mo@example.test', '2 minutes')
  assert.equal(await alive(inv), 410)
  assert.equal((await setPassword(inv, 'mo-password-1')).status, 410)

  await api('POST', 'accounts/mo@example.test/reset', { notify: false })
  await forgot('mo@example.test')
  const reset = await newLink('mo@example.test', 'reset')
  await age('mo@example.test', '59 minutes')
  assert.equal(await alive(reset), 200, 'still valid a minute before 1 hour')
  await age('mo@example.test', '2 minutes')
  assert.equal((await setPassword(reset, 'mo-password-2')).status, 410)
})

test('forgot password answers the same for known and unknown emails, and is rate limited', async () => {
  await api('PUT', 'artifacts/links/shares', { email: 'rhea@example.test', role: 'viewer', notify: false })
  const known = await forgot('rhea@example.test')
  const unknown = await forgot('ghost@example.test')
  const page = (r) => [r.status, r.text.replace(/nonce="[^"]+"/g, '')]
  assert.deepEqual(page(unknown), page(known))
  await newLink('rhea@example.test', 'reset')

  // Per address: one client trying many emails.
  const ip = freshIp()
  const perIp = []
  for (let i = 0; i < 6; i++) perIp.push((await forgot(`nobody-${i}@example.test`, ip)).status)
  assert.deepEqual(perIp, [200, 200, 200, 200, 200, 429])
  // Per email, from many addresses, and the same for an account as for no account.
  const perEmail = async (email) => { const s = []; for (let i = 0; i < 6; i++) s.push((await forgot(email)).status); return s }
  assert.deepEqual(await perEmail('ghost2@example.test'), [200, 200, 200, 200, 200, 429])
  assert.deepEqual(await perEmail('rhea@example.test'), [200, 200, 200, 200, 429, 429], 'rhea already asked once above')
})

// ---------- sign-in and unlock limits ----------

test('the admin email cannot be told apart from an account or an unknown email by its sign-in answers', async () => {
  await api('PUT', 'artifacts/links/shares', { email: 'kim@example.test', role: 'viewer', notify: false })
  const answers = async (email) => {
    const ip = freshIp()
    const out = []
    for (let i = 0; i < 12; i++) {
      const r = await new Browser().req(`${ORIGIN.app}/api/session`, { method: 'POST', shell: true, headers: ip, json: { email, password: `wrong-${i}` } })
      out.push([r.status, r.body])
    }
    return out
  }
  const admin = await answers(ADMIN.email)
  assert.deepEqual(await answers('kim@example.test'), admin)
  assert.deepEqual(await answers('nobody-at-all@example.test'), admin)
  assert.equal(admin[0][0], 401)
  assert.equal(admin.at(-1)[0], 429)
})

test('wrong guesses from one client lock out that client, not the real person', async () => {
  const pw = (await api('PUT', 'artifacts/links/shares', { email: 'ivy@example.test', role: 'viewer', notify: false })).body.password
  const attacker = freshIp()
  const s = []
  for (let i = 0; i < 12; i++) s.push((await new Browser().req(`${ORIGIN.app}/api/session`, { method: 'POST', shell: true, headers: attacker, json: { email: 'ivy@example.test', password: `wrong-${i}` } })).status)
  assert.equal(s.at(-1), 429)
  const ivy = await new Browser().req(`${ORIGIN.app}/api/session`, { method: 'POST', shell: true, headers: freshIp(), json: { email: 'ivy@example.test', password: pw } })
  assert.equal(ivy.status, 200)

  // A parallel burst from one client is held to the same limit.
  const burst = freshIp()
  const statuses = await Promise.all(Array.from({ length: 15 }, (_, i) =>
    new Browser().req(`${ORIGIN.app}/api/session`, { method: 'POST', shell: true, headers: burst, json: { email: 'ivy@example.test', password: `burst-${i}` } }).then((r) => r.status)))
  assert.ok(statuses.filter((x) => x === 401).length <= 5, `${statuses}`)
  assert.equal((await new Browser().req(`${ORIGIN.app}/api/session`, { method: 'POST', shell: true, headers: freshIp(), json: { email: 'ivy@example.test', password: pw } })).status, 200)
})

test('one client cannot lock everyone out of a shared-password artifact, even with a parallel burst', async () => {
  const a = await create('pw-burst', { access: { kind: 'password', password: 'the-real-password' } })
  const unlock = (b, password, headers) => b.req(`${ORIGIN.app}/api/a/${a.id}/unlock`, { method: 'POST', shell: true, headers, json: { password } })
  const attacker = freshIp()
  for (let round = 0; round < 3; round++) {
    const statuses = await Promise.all(Array.from({ length: 30 }, (_, i) => unlock(new Browser(), `wrong-${round}-${i}`, attacker).then((r) => r.status)))
    assert.ok(statuses.filter((x) => x === 401).length <= (round ? 0 : 20), `round ${round}: ${statuses}`)
  }
  assert.equal((await unlock(new Browser(), 'the-real-password', attacker)).status, 429)
  assert.equal((await unlock(new Browser(), 'the-real-password', freshIp())).status, 200, 'anyone else still gets in')
})

// ---------- ticket 08: who can respond ----------

test('a visitor who entered by shared password responds anonymously or with a declared name, and never writes state', async () => {
  const a = await create('pw-quiz', { access: { kind: 'password', role: 'responder', password: 'quiz-password' } })
  await settings('pw-quiz', { who: 'anonymous' })
  const enter = async () => {
    const b = new Browser()
    assert.equal((await b.req(`${ORIGIN.app}/api/a/${a.id}/unlock`, { method: 'POST', shell: true, json: { password: 'quiz-password' } })).status, 200)
    assert.equal((await b.open('pw-quiz')).boot.role, 'responder')
    return b
  }
  const p = await enter()
  assert.equal((await respond(p, a, { answers: { q1: 'anon' } })).status, 200)
  await settings('pw-quiz', { who: 'declared' })
  const named = await enter()
  assert.equal((await respond(named, a, { answers: { q1: 'named' } })).status, 400, 'declared mode needs a name or email')
  assert.equal((await respond(named, a, { answers: { q1: 'named' }, name: 'Pía' })).status, 200)
  const list = (await api('GET', 'artifacts/pw-quiz/responses')).body
  assert.deepEqual(list.map((r) => [r.answers.q1, r.identity, r.name]), [['anon', 'browser', null], ['named', 'browser', 'Pía']])

  // Every door that writes state refuses the responder's cookies.
  const pg = await p.open('pw-quiz')
  const doors = [
    () => p.req(`${ORIGIN.app}/api/a/${a.id}/state`, { method: 'PUT', shell: true, json: { state: { hacked: 1 } } }),
    () => p.req(`${ORIGIN.app}/api/a/${a.id}/state`, { method: 'PUT', shell: true, json: { state: { hacked: 1 }, baseRev: 0 } }),
    () => p.req(`${ORIGIN.app}/api/v1/artifacts/pw-quiz/state`, { method: 'PUT', json: { state: { hacked: 1 } }, headers: { origin: ORIGIN.app } }),
    () => p.req(`${ORIGIN.app}/mcp`, { method: 'POST', json: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'put_state', arguments: { ref: 'pw-quiz', state: { hacked: 1 } } } } }),
    () => p.req(`${ORIGIN.main}/api/admin/artifacts/artifacts/pw-quiz/state`, { method: 'PUT', json: { state: { hacked: 1 } }, headers: { origin: ORIGIN.main } }),
    () => p.req(pg.iframe, { method: 'PUT', body: '{"hacked":1}' }),
  ]
  for (const door of doors) assert.ok([401, 403, 404, 405].includes((await door()).status))
  assert.equal((await api('GET', 'artifacts/pw-quiz/state')).body.rev, 0)
})

// ---------- ticket 10: response emails ----------

test('owner notification once per response; account copies show score and answers only as the artifact allows; one receipt per typed address', async () => {
  const a = await create('mail-quiz', { access: { kind: 'link', role: 'responder' } })
  await settings('mail-quiz', { who: 'anonymous', feedback: 'none', notifyOwner: true })
  await api('PUT', 'artifacts/mail-quiz/answer-key', { key: { q1: { answer: 'Rosario' } } })
  const ownerMails = () => mailsTo(OWNER_INBOX, /T mail-quiz/).length

  const x = new Browser()
  await x.open('mail-quiz')
  assert.equal((await respond(x, a, { answers: { q1: 'first' } })).status, 200)
  await mailTo(app.mail, () => ownerMails() === 1)
  assert.equal((await respond(x, a, { answers: { q1: 'corrected' } })).status, 200)
  const y = new Browser()
  await y.open('mail-quiz')
  await respond(y, a, { answers: { q1: 'barrier' } })
  await mailTo(app.mail, () => ownerMails() >= 2)
  await sleep(500)
  assert.equal(ownerMails(), 2, 'correcting a response does not notify the owner again')

  // Account copies, one account per feedback setting (a shown result is final).
  const copyFor = async (email, feedback) => {
    await settings('mail-quiz', { who: 'account', feedback })
    const pw = (await api('PUT', 'artifacts/mail-quiz/shares', { email, role: 'responder', notify: false })).body.password
    const b = new Browser()
    assert.equal((await b.signIn(email, pw)).status, 200)
    await b.open('mail-quiz')
    assert.equal((await respond(b, a, { answers: { q1: 'Córdoba' } })).status, 200)
    return (await mailTo(app.mail, (m) => m.to.includes(email) && /Tu respuesta/.test(m.subject))).text
  }
  const none = await copyFor('nell@example.test', 'none')
  assert.match(none, /Córdoba/)
  assert.doesNotMatch(none, /Puntaje|Rosario/)
  const score = await copyFor('sol@example.test', 'score')
  assert.match(score, /Puntaje: 0 de 1/)
  assert.doesNotMatch(score, /Rosario/)
  const answers = await copyFor('ana-b@example.test', 'answers')
  assert.match(answers, /Puntaje: 0 de 1/)
  assert.match(answers, /Rosario/)

  // A typed address gets the fixed receipt once: not on correction, not from another browser.
  await settings('mail-quiz', { who: 'declared', feedback: 'none' })
  const d1 = new Browser()
  await d1.open('mail-quiz')
  assert.equal((await respond(d1, a, { answers: { q1: 'z1' }, email: 'zoe@example.test' })).status, 200)
  await mailTo(app.mail, () => mailsTo('zoe@example.test').length === 1)
  assert.equal((await respond(d1, a, { answers: { q1: 'z2' }, email: 'zoe@example.test' })).status, 200)
  const d2 = new Browser()
  await d2.open('mail-quiz')
  assert.equal((await respond(d2, a, { answers: { q1: 'z3' }, email: 'zoe@example.test' })).status, 200)
  const d3 = new Browser()
  await d3.open('mail-quiz')
  await respond(d3, a, { answers: { q1: 'b' }, email: 'barrier@example.test' })
  await mailTo(app.mail, () => mailsTo('barrier@example.test').length === 1)
  await sleep(500)
  assert.equal(mailsTo('zoe@example.test').length, 1)
  assert.match(mailsTo('zoe@example.test')[0].text, /Recibimos tu respuesta/)
})

// ---------- ticket 04: state history ----------

test('the newest 500 state revisions are kept; the guest history lists the newest 100 and older ones open by number', async () => {
  const a = await create('revs', { access: { kind: 'link', role: 'editor' } })
  for (let i = 1; i <= 502; i++) assert.equal((await api('PUT', 'artifacts/revs/state', { state: { i } })).status, 200)
  const all = (await api('GET', 'artifacts/revs/state/history?limit=1000')).body
  assert.equal(all.length, 500)
  assert.deepEqual([all[0].rev, all.at(-1).rev], [502, 3])
  assert.equal((await api('GET', 'artifacts/revs/state?rev=2')).status, 404)
  assert.deepEqual((await api('GET', 'artifacts/revs/state?rev=3')).body.state, { i: 3 })

  const ed = new Browser()
  await ed.open('revs')
  const guest = (await ed.req(`${ORIGIN.app}/api/a/${a.id}/state/history`, { shell: true })).body
  assert.deepEqual([guest.length, guest[0].rev, guest.at(-1).rev], [100, 502, 403])
  assert.deepEqual((await ed.req(`${ORIGIN.app}/api/a/${a.id}/state?rev=3`, { shell: true })).body.state, { i: 3 })
})

// ---------- ticket 14: MCP tokens ----------

test('MCP refuses invalid and revoked tokens and holds a limited token to the API limits', async () => {
  const rpc = (token, method, params) => new Browser().req(`${ORIGIN.app}/mcp`, {
    method: 'POST', json: { jsonrpc: '2.0', id: 1, method, params }, headers: { accept: 'application/json, text/event-stream', authorization: `Bearer ${token}` },
  })
  const call = async (token, name, args) => (await rpc(token, 'tools/call', { name, arguments: args })).body.result
  assert.equal((await rpc('not-a-token', 'tools/list')).status, 401)
  const t = await asOwner('POST', 'tokens', { name: 'mcp-revoked' })
  assert.equal((await rpc(t.body.token, 'tools/list')).status, 200)
  await asOwner('DELETE', `tokens/${t.body.id}`)
  assert.equal((await rpc(t.body.token, 'tools/list')).status, 401)

  const lim = (await asOwner('POST', 'tokens', { name: 'mcp-limited', limited: true })).body.token
  await create('not-the-mcps')
  assert.equal((await call(lim, 'create_artifact', { title: 'Open', html: html('o'), access: { kind: 'link' } })).isError, true)
  const mine = await call(lim, 'create_artifact', { title: 'MCP limited', slug: 'mcp-limited', html: html('m') })
  assert.equal(mine.isError, false, JSON.stringify(mine))
  assert.deepEqual(JSON.parse((await call(lim, 'list_artifacts', {})).content[0].text).map((x) => x.slug), ['mcp-limited'])
  assert.equal((await call(lim, 'publish_version', { ref: 'mcp-limited', html: html('v2') })).isError, false)
  for (const [name, args] of [
    ['get_artifact', { ref: 'not-the-mcps' }], ['put_state', { ref: 'not-the-mcps', state: 1 }],
    ['set_general_access', { ref: 'mcp-limited', kind: 'link' }], ['share_artifact', { ref: 'mcp-limited', email: 'x@example.test', role: 'viewer', notify: false }],
    ['delete_artifact', { ref: 'mcp-limited' }], ['list_accounts', {}], ['storage', {}],
  ]) {
    const r = await call(lim, name, args)
    assert.equal(r.isError, true, name)
    assert.doesNotMatch(r.content.map((c) => c.text).join(' '), /url: /, `${name} leaks no URL`)
  }
  assert.equal((await api('GET', 'artifacts/mcp-limited')).body.access.kind, 'restricted')
})

// ---------- last: it restarts the app with no mail server ----------

test('a failing mail server neither loses nor rejects a response', async () => {
  await app.stop()
  app = await startApp({ SMTP_PORT: '1' })
  const a = await create('no-mail', { access: { kind: 'link', role: 'responder' } })
  await settings('no-mail', { who: 'declared', notifyOwner: true })
  const b = new Browser()
  await b.open('no-mail')
  const r = await respond(b, a, { answers: { q1: 'kept' }, name: 'Uma', email: 'uma@example.test' })
  assert.equal(r.status, 200, r.text)
  assert.deepEqual((await api('GET', 'artifacts/no-mail/responses')).body.map((x) => [x.name, x.answers.q1]), [['Uma', 'kept']])
})
