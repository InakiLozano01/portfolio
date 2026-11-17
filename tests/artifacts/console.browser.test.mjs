// Seam C for the admin Artifacts page and the owner's Share button: what browser.test.mjs does not drive.
// Run: NEXT_DIST_DIR=.next-test npx next build && node --test --test-concurrency=1 tests/artifacts/console.browser.test.mjs
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import { promisify } from 'node:util'
import { ADMIN, Browser, ORIGIN, agent, mailTo, removeContainers, startApp, startServices } from './stack.mjs'

const run = promisify(execFile)
const IMAGE = process.env.ARTIFACTS_BROWSER_IMAGE || 'journal_app-browser-runner:rollback-f662c40260'
let services, app, api

async function drive(scenario, env = {}) {
  const e = { SCENARIO: scenario, MAIN: ORIGIN.main, APP: ORIGIN.app, EMAIL: ADMIN.email, PASSWORD: ADMIN.password, ...env }
  try {
    const { stdout } = await run('docker', ['run', '--rm', '--network', 'host', '-v', `${import.meta.dirname}:/t:ro`,
      ...Object.entries(e).flatMap(([k, v]) => ['-e', `${k}=${v}`]), '--entrypoint', 'node', IMAGE, '/t/console-driver.cjs'], { maxBuffer: 1 << 24, timeout: 200000 })
    return JSON.parse(stdout.trim().split('\n').pop())
  } catch (err) {
    assert.fail(`browser driver (${scenario}) failed:\n${err.stdout}\n${err.stderr}`)
  }
}

before(async () => {
  services = await startServices()
  app = await startApp()
  const owner = new Browser()
  await owner.signIn(ADMIN.email, ADMIN.password)
  api = agent((await owner.req(`${ORIGIN.app}/api/v1/tokens`, { method: 'POST', json: { name: 'console' }, headers: { origin: ORIGIN.app } })).body.token)
  for (const [slug, title] of [['console-demo', 'Console demo'], ['keep-me', 'Keep me'], ['doomed', 'Doomed']]) {
    assert.equal((await api('POST', 'artifacts', { title, slug, html: '<p>one</p>', note: 'first' })).status, 201)
  }
  assert.equal((await api('POST', 'artifacts/console-demo/versions', { html: '<p>two</p>', note: 'second' })).status, 201)
  for (const email of ['pat@example.test', 'quinn@example.test']) {
    assert.equal((await api('PUT', 'artifacts/keep-me/shares', { email, role: 'viewer', notify: false })).status, 200)
  }
}, { timeout: 180000 })

after(async () => {
  await app?.stop()
  await services?.pool.end()
  removeContainers()
})

test('console page: rename, re-slug, roll back, response settings, people, tokens, delete', { timeout: 240000 }, async () => {
  const seen = await drive('console')
  assert.equal(seen.error, undefined)

  const a = (await api('GET', 'artifacts/console-renamed')).body
  assert.equal(a.title, 'Console renamed')
  assert.equal((await api('GET', 'artifacts/console-demo')).status, 404)
  assert.equal(a.version, 3)
  assert.equal((await api('GET', 'artifacts/console-renamed/files/index.html')).text.includes('<p>one</p>'), true)
  assert.deepEqual(a.responses, { who: 'declared', open: false, feedback: 'score', notifyOwner: true })

  assert.equal(seen.prompted, false, 'renaming an account must not use window.prompt')
  const accounts = (await api('GET', 'accounts')).body
  assert.deepEqual(accounts.map((x) => [x.email, x.alias, x.hasPassword]), [['pat@example.test', 'Pat', false]])
  const reset = await mailTo(app.mail, (m) => m.to.includes('pat@example.test') && /Restablecer/.test(m.subject))
  assert.ok(reset.links.some((l) => l.startsWith(`${ORIGIN.app}/reset/`)))

  // The limited token creates its own restricted artifact, cannot share it or reach others, and dies when revoked.
  assert.deepEqual([seen.tokenCreate, seen.tokenShare, seen.tokenOther, seen.tokenAfterRevoke], [201, 403, 404, 401])

  assert.equal(seen.keptAfterCancel, true)
  assert.equal((await api('GET', 'artifacts/doomed')).status, 404)
})

test('share dialog from the keyboard, over the artifact and in the console', { timeout: 240000 }, async () => {
  const seen = await drive('keyboard')
  assert.equal(seen.error, undefined)
  const inDialog = /^(button:(Close|Copy link|Share|Remove .*|Resend invitation to .*)|select:(Who can open it|They can|Role|Role for .*)|input:(Email|Name to show \(optional\)|\s*Send invitation))/

  // On the artifact: the dialog opens over it, takes focus, keeps Tab inside, Escape closes it and focus comes back.
  assert.match(seen.shellFocusOnOpen, inDialog)
  for (const f of seen.shellTabOrder) assert.match(f, inDialog, `Tab left the share dialog: ${seen.shellTabOrder}`)
  assert.equal(seen.shellStayed, '/keep-me')
  assert.equal(seen.shellFocusAfterClose, 'a:Compartir')
  assert.equal(seen.artifactInert, false)
  assert.equal((await api('GET', 'artifacts/keep-me')).body.access.kind, 'link')

  // In the console: the same, and focus returns to the row's Share button whether closed by Escape or the Close button.
  assert.match(seen.consoleFocusOnOpen, inDialog)
  for (const f of seen.consoleTabOrder) assert.match(f, inDialog, `Tab left the share dialog: ${seen.consoleTabOrder}`)
  assert.equal(seen.consoleFocusAfterEscape, 'button:Share Keep me')
  assert.equal(seen.consoleFocusAfterClose, 'button:Share Keep me')
})

test('invitation, forgot-password and reset pages', { timeout: 240000 }, async () => {
  const shared = await api('PUT', 'artifacts/keep-me/shares', { email: 'ivy@example.test', role: 'editor' })
  assert.equal(shared.status, 200, `${shared.text}\n${fs.readFileSync(app.logFile, 'utf8').slice(-3000)}`)
  const invite = (await mailTo(app.mail, (m) => m.to.includes('ivy@example.test'))).links.find((l) => l.startsWith(`${ORIGIN.app}/invite/`))
  const seen = await drive('invite', { LINK: invite })
  assert.equal(seen.error, undefined)
  assert.equal(seen.inviteHeading, 'Elegí tu contraseña')
  assert.equal(seen.inviteLanded, '/keep-me')
  assert.equal(seen.inviteReused, 'Este enlace ya se usó o venció')
  assert.equal(seen.forgotHeading, 'Revisá tu email')

  const mail = await mailTo(app.mail, (m) => m.to.includes('ivy@example.test') && /Restablecer/.test(m.subject))
  const link = mail.links.find((l) => l.startsWith(`${ORIGIN.app}/reset/`))
  assert.ok(link, JSON.stringify(mail))
  const reset = await drive('reset', { LINK: link })
  assert.equal(reset.error, undefined)
  assert.equal(reset.resetHeading, 'Elegí una contraseña nueva')
  assert.equal(reset.shortBlocked, true)
  assert.equal((await new Browser().signIn('ivy@example.test', 'ivy-chosen-pass')).status, 401)
  assert.equal((await new Browser().signIn('ivy@example.test', 'ivy-new-pass-2')).status, 200)
})
