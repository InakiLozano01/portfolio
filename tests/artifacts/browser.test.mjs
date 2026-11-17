// Seam C: the viewer shell, the owner's share page and the admin console in a real Chromium, against the Seam A stack.
// Chromium comes from a local Playwright image (ARTIFACTS_BROWSER_IMAGE); it runs with --network host.
// Run: NEXT_DIST_DIR=.next-test npx next build && npm run test:artifacts:browser
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ADMIN, Browser, ORIGIN, agent, removeContainers, startApp, startServices } from './stack.mjs'

const run = promisify(execFile)
const IMAGE = process.env.ARTIFACTS_BROWSER_IMAGE || 'journal_app-browser-runner:rollback-f662c40260'
let services, app, api

// The artifact itself probes what its code can reach from inside the sandbox, then answers a question through the client.
const PROBE = (appOrigin) => `<!doctype html><html><head><title>Browser demo</title></head><body><h1>Browser demo</h1><script>
const out = {}
const tryIt = (k, f) => { try { out[k] = f() } catch (e) { out[k] = 'blocked:' + e.name } }
tryIt('cookie', () => document.cookie)
tryIt('parent', () => parent.document.title)
tryIt('storage', () => { localStorage.setItem('x', '1'); return 'ok' })
const fetchIt = (url, init) => fetch(url, { credentials: 'include', ...init }).then((r) => 'status:' + r.status, (e) => 'rejected:' + e.name)
artifact.ready.then(async (info) => {
  out.role = info.role
  out.agentApi = await fetchIt(${JSON.stringify(appOrigin)} + '/api/v1/artifacts')
  out.guestApi = await fetchIt(${JSON.stringify(appOrigin)} + '/api/a/' + info.id + '/state', { headers: { 'X-Artifact-Shell': '1' } })
  out.response = (await artifact.submitResponse({ q1: 'b' })).response.answers.q1
}).catch((e) => { out.error = String(e && e.message) }).finally(() => { document.body.dataset.done = JSON.stringify(out) })
</script></body></html>`

before(async () => {
  services = await startServices()
  app = await startApp()
  const owner = new Browser()
  await owner.signIn(ADMIN.email, ADMIN.password)
  api = agent((await owner.req(`${ORIGIN.app}/api/v1/tokens`, { method: 'POST', json: { name: 'browser' }, headers: { origin: ORIGIN.app } })).body.token)
  const r = await api('POST', 'artifacts', { title: 'Browser demo', slug: 'browser-demo', html: PROBE(ORIGIN.app), access: { kind: 'link', role: 'responder' } })
  assert.equal(r.status, 201, r.text)
  await api('PATCH', 'artifacts/browser-demo', { responses: { who: 'anonymous' } })
}, { timeout: 180000 })

after(async () => {
  await app?.stop()
  await services?.pool.end()
  removeContainers()
})

test('shell, share page and admin console in Chromium', { timeout: 240000 }, async () => {
  let stdout
  try {
    ({ stdout } = await run('docker', ['run', '--rm', '--network', 'host', '-v', `${import.meta.dirname}:/t:ro`,
      '-e', `MAIN=${ORIGIN.main}`, '-e', `APP=${ORIGIN.app}`, '-e', 'SLUG=browser-demo', '-e', `EMAIL=${ADMIN.email}`, '-e', `PASSWORD=${ADMIN.password}`,
      '--entrypoint', 'node', IMAGE, '/t/browser-driver.cjs'], { maxBuffer: 1 << 24, timeout: 200000 }))
  } catch (e) {
    assert.fail(`browser driver failed:\n${e.stdout}\n${e.stderr}`)
  }
  const seen = JSON.parse(stdout.trim().split('\n').pop())

  // Artifact code runs in an opaque origin: no cookies, no parent page, no storage, no API.
  assert.match(seen.probes.cookie, /^blocked:SecurityError$/)
  assert.match(seen.probes.parent, /^blocked:SecurityError$/)
  assert.match(seen.probes.storage, /^blocked:SecurityError$/)
  assert.match(seen.probes.agentApi, /^rejected:TypeError$/)
  assert.match(seen.probes.guestApi, /^rejected:TypeError$/)
  // ...while the client bridge works, with the visitor's real role.
  assert.equal(seen.probes.role, 'owner')
  assert.equal(seen.probes.response, 'b')
  assert.match(seen.contentUrl, /\/c\/[^/]+\/index\.html$/)

  assert.equal(seen.sharePageTitle, 'Browser demo')
  assert.equal(seen.backOnArtifact, true)
  assert.match(seen.listedAccess, /Anyone with the link · responder/)
  // One response from before the owner signed in (anonymous, by browser), one from the owner.
  assert.deepEqual(seen.responseRows, ['Anonymous', 'You'])
  assert.match(seen.csv.split('\r\n')[0], /"q1"$/)
  assert.deepEqual(seen.json.map((r) => r.answers.q1).sort(), ['b', 'b'])
  assert.equal(seen.sharedWithEditor, 'editor')
  assert.equal(seen.removed, true)
  assert.equal(seen.revokedStatus, 403)
  assert.match(seen.createdToken, /^[A-Za-z0-9_-]{40,}$/)
  assert.equal(seen.tokenAcceptedStatus, 200)
  assert.equal(seen.tokenRevokedStatus, 401)

  // What the console did is real on the server.
  const d = (await api('GET', 'artifacts/browser-demo')).body
  assert.equal(d.access.kind, 'restricted')
  assert.deepEqual(d.shares, [])
  assert.equal((await new Browser().open('browser-demo')).boot.role, null)
})
