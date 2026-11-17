// Seam A for large files and the CLI: integrity, resume across runs, the open-upload limit, limited tokens.
// Run: NEXT_DIST_DIR=.next-test npx next build && npm run test:artifacts:uploads
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { execFile, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { ADMIN, Browser, ORIGIN, ROOT, agent, removeContainers, startApp, startServices } from './stack.mjs'

const run = promisify(execFile)
const CLI = path.join(ROOT, 'scripts/artifacts.mjs')
const CAP = 512 << 20
const MB = 1 << 20
let services, app, api, owner, token
const tmp = []
const html = (title) => `<!doctype html><html><head><title>${title}</title></head><body><h1>${title}</h1></body></html>`
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

before(async () => {
  services = await startServices()
  app = await startApp({ ARTIFACTS_STORAGE_CAP_BYTES: String(CAP) })
  owner = new Browser()
  assert.equal((await owner.signIn(ADMIN.email, ADMIN.password)).status, 200)
  token = await mintToken('uploads-agent')
  api = agent(token)
}, { timeout: 180000 })

after(async () => {
  if (process.env.ARTIFACTS_TEST_KEEP_LOG && app) console.log(fs.readFileSync(app.logFile, 'utf8'))
  await app?.stop()
  await services?.pool.end()
  removeContainers()
  for (const d of tmp) fs.rmSync(d, { recursive: true, force: true })
})

async function mintToken(name, limited = false) {
  const t = await owner.req(`${ORIGIN.app}/api/v1/tokens`, { method: 'POST', json: { name, limited }, headers: { origin: ORIGIN.app } })
  assert.equal(t.status, 201, t.text)
  return t.body.token
}

const mkdir = (prefix) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix)); tmp.push(d); return d }

/** A folder on disk: {relPath: Buffer | string}. */
function folder(files) {
  const dir = mkdir('artifacts-up-')
  for (const [rel, data] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    fs.writeFileSync(path.join(dir, rel), data)
  }
  return dir
}

/** CLI environment with its own token file. */
function cliEnv(tok) {
  const home = mkdir('artifacts-up-home-')
  fs.mkdirSync(path.join(home, '.config/artifacts'), { recursive: true })
  fs.writeFileSync(path.join(home, '.config/artifacts/token'), tok, { mode: 0o600 })
  return { ...process.env, HOME: home, ARTIFACTS_URL: ORIGIN.app }
}
const cliRaw = (env, ...args) => run(process.execPath, [CLI, ...args], { env, maxBuffer: 1 << 24 })
const cliJson = async (env, ...args) => JSON.parse((await cliRaw(env, ...args)).stdout)
const partsLogged = (stderr) => [...stderr.matchAll(/^ {2}(\S+): part (\d+)\/\d+$/gm)].map((m) => `${m[1]}#${m[2]}`)

/** Starts an upload of `data` and sends its parts with their digests. */
async function uploadAll(call, slug, rel, data, tok) {
  const u = await call('POST', `artifacts/${slug}/uploads`, { path: rel, size: data.length, sha256: sha(data) })
  assert.equal(u.status, 201, u.text)
  for (let n = 1; n <= u.body.partCount; n++) {
    const part = data.subarray((n - 1) * u.body.partSize, n * u.body.partSize)
    const r = await putPart(u.body.id, n, part, tok)
    assert.equal(r.status, 200, r.text)
  }
  return u.body
}
const putPart = (id, n, buf, tok = token, digest = sha(buf)) =>
  new Browser().req(`${ORIGIN.app}/api/v1/uploads/${id}/parts/${n}`, { method: 'PUT', body: buf, headers: { authorization: `Bearer ${tok}`, 'x-content-sha256': digest } })

test('CLI first publish of a folder with large files is one version holding everything', async () => {
  const big = crypto.randomBytes(5 * MB + 3)
  const video = crypto.randomBytes(1000)
  const dir = folder({ 'index.html': html('One version'), 'media/big.bin': big, 'media/clip.mp4': video })
  const pub = await cliJson(cliEnv(token), 'publish', dir)
  assert.equal(pub.url, `${ORIGIN.app}/${pub.slug}`)
  assert.equal(pub.version, 1)
  assert.deepEqual(pub.versions.map((v) => v.version), [1])
  assert.deepEqual(pub.files.map((f) => f.path), ['index.html', 'media/big.bin', 'media/clip.mp4'])
  assert.equal(pub.files.find((f) => f.path === 'media/big.bin').sha256, sha(big))
})

test('a killed CLI publish resumes on rerun: one artifact, no part or staged upload sent twice', { timeout: 120000 }, async () => {
  const a = crypto.randomBytes(16 * MB + 11) // 2 parts
  const b = crypto.randomBytes(32 * MB + 13) // 3 parts
  const title = `Killed ${crypto.randomUUID()}`
  const dir = folder({ 'index.html': html(title), 'a.bin': a, 'b.bin': b })
  const env = cliEnv(token)

  // Kill the first run once it has finished one file and sent a part of the other.
  const child = spawn(process.execPath, [CLI, 'publish', dir], { env })
  let err1 = ''
  await new Promise((resolve) => {
    child.stderr.on('data', (d) => {
      err1 += d
      const files = new Set(partsLogged(err1).map((p) => p.split('#')[0]))
      if (files.size === 2 && !child.killed) child.kill('SIGKILL')
    })
    child.on('exit', resolve)
  })
  const first = partsLogged(err1)
  const firstFile = first[0].split('#')[0]
  assert.equal(first.filter((p) => p.startsWith(`${firstFile}#`)).length, firstFile === 'a.bin' ? 2 : 3, `first file finished before the kill: ${first}`)

  const { stdout, stderr } = await cliRaw(env, 'publish', dir)
  const pub = JSON.parse(stdout)
  const again = partsLogged(stderr)
  assert.deepEqual(again.filter((p) => first.includes(p)), [], 'no part is sent twice')
  assert.ok(!again.some((p) => p.startsWith(`${firstFile}#`)), 'the staged upload is not sent again')
  assert.deepEqual(pub.versions.map((v) => v.version), [1])
  assert.equal(pub.files.find((f) => f.path === 'a.bin').sha256, sha(a))
  assert.equal(pub.files.find((f) => f.path === 'b.bin').sha256, sha(b))
  assert.equal((await api('GET', 'artifacts')).body.filter((x) => x.title === title).length, 1)
  assert.equal((await api('GET', 'storage')).body.usedBytes < CAP, true)
})

test('CLI upload adds one file as a new version, and every artifact command prints the URL', async () => {
  const env = cliEnv(token)
  const dir = folder({ 'index.html': html('Upload cmd'), 'doc.bin': crypto.randomBytes(17 * MB) })
  const pub = await cliJson(env, 'publish', dir, '--slug', 'upload-cmd')
  const url = `${ORIGIN.app}/upload-cmd`
  const up = await cliJson(env, 'upload', 'upload-cmd', path.join(dir, 'doc.bin'), '--path', 'files/doc.bin')
  assert.equal(up.url, url)
  assert.equal(up.version, pub.version + 1)
  assert.equal(up.files.find((f) => f.path === 'files/doc.bin').sha256, sha(fs.readFileSync(path.join(dir, 'doc.bin'))))

  const cmds = [
    ['get', 'upload-cmd'], ['rollback', 'upload-cmd', '1'], ['access', 'upload-cmd', 'link', '--role', 'responder'],
    ['shares', 'upload-cmd'], ['share', 'upload-cmd', 'url@example.test', 'viewer', '--no-email'], ['resend', 'upload-cmd', 'url@example.test'],
    ['unshare', 'upload-cmd', 'url@example.test'], ['state', 'put', 'upload-cmd', '--json', '{"a":1}'], ['state', 'get', 'upload-cmd'],
    ['state', 'history', 'upload-cmd'], ['responses', 'settings', 'upload-cmd', '--who', 'anonymous'], ['responses', 'export', 'upload-cmd'],
    ['answer-key', 'upload-cmd', '--json', '{"q1":{"answer":"a"}}'], ['answer-key', 'upload-cmd', '--show'], ['answer-key', 'upload-cmd', '--delete'],
  ]
  for (const args of cmds) assert.equal((await cliJson(env, ...args)).url, url, args.join(' '))
  const csv = await cliRaw(env, 'responses', 'export', 'upload-cmd', '--csv')
  assert.match(csv.stderr, new RegExp(`${url}\\n`))
  assert.ok((await cliJson(env, 'list')).every((x) => x.url === `${ORIGIN.app}/${x.slug}`))
  assert.equal((await cliJson(env, 'rename', 'upload-cmd', '--slug', 'upload-cmd-2')).url, `${ORIGIN.app}/upload-cmd-2`)
  assert.equal((await cliJson(env, 'delete', 'upload-cmd-2', '--yes')).url, `${ORIGIN.app}/upload-cmd-2`)
})

test('a corrupted or swapped part is refused and creates no version', async () => {
  const a = (await api('POST', 'artifacts', { title: 'Integrity', slug: 'integrity', html: html('Integrity') })).body
  const data = crypto.randomBytes(32 * MB)
  assert.equal((await api('POST', 'artifacts/integrity/uploads', { path: 'x.bin', size: data.length, sha256: 'nope' })).status, 400)
  const u = (await api('POST', 'artifacts/integrity/uploads', { path: 'x.bin', size: data.length, sha256: sha(data) })).body
  const p1 = data.subarray(0, 16 * MB)
  const p2 = data.subarray(16 * MB)

  // Corrupted in transit: the bytes do not match the part's digest.
  const flipped = Buffer.from(p1)
  flipped[5] ^= 1
  const bad = await putPart(u.id, 1, flipped, token, sha(p1))
  assert.equal(bad.status, 400)
  assert.equal(bad.body.error.code, 'integrity')
  assert.deepEqual((await api('GET', `uploads/${u.id}`)).body.received, [])
  assert.equal((await putPart(u.id, 1, p1, token, 'x')).status, 400, 'a malformed part digest is refused')

  // Swapped: each part matches its own digest, but the file does not match its digest.
  assert.equal((await putPart(u.id, 1, p2)).status, 200)
  assert.equal((await putPart(u.id, 2, p1)).status, 200)
  const done = await api('POST', `uploads/${u.id}/complete`, {})
  assert.equal(done.status, 422, done.text)
  assert.equal(done.body.error.code, 'integrity')
  const after = (await api('GET', 'artifacts/integrity')).body
  assert.equal(after.version, a.version)
  assert.deepEqual(after.files.map((f) => f.path), ['index.html'])
  assert.equal((await api('GET', `uploads/${u.id}`)).status, 404, 'the bad upload is dropped; start again')
})

test('multipart starts require a declared whole-file sha256', async () => {
  await api('POST', 'artifacts', { title: 'Hash required', slug: 'hash-required', html: html('Hash required') })
  const missing = await api('POST', 'artifacts/hash-required/uploads', { path: 'x.bin', size: 1 })
  assert.equal(missing.status, 400, missing.text)
  assert.equal(missing.body.error.code, 'bad_request')
})

test('repeating complete is safe for staged and unstaged uploads', async () => {
  await api('POST', 'artifacts', { title: 'Repeat', slug: 'repeat', html: html('Repeat') })
  const data = crypto.randomBytes(1000)
  const u = await uploadAll(api, 'repeat', 'r.bin', data, token)
  const first = await api('POST', `uploads/${u.id}/complete`, {})
  assert.equal(first.status, 201, first.text)
  const second = await api('POST', `uploads/${u.id}/complete`, {})
  assert.equal(second.status, 200, second.text)
  assert.equal(second.body.version, first.body.version)
  assert.equal((await api('GET', 'artifacts/repeat')).body.versions.length, first.body.versions.length)

  const s = await uploadAll(api, 'repeat', 's.bin', data, token)
  const st1 = await api('POST', `uploads/${s.id}/complete`, { stage: true })
  const st2 = await api('POST', `uploads/${s.id}/complete`, { stage: true })
  assert.deepEqual(st2.body, st1.body)
  assert.equal((await api('POST', 'artifacts/repeat/versions', { uploads: [s.id] })).status, 201)
})

test('concurrent complete and version publish consume one upload once', async () => {
  await api('POST', 'artifacts', { title: 'Concurrent', slug: 'concurrent', html: html('Concurrent') })
  const data = crypto.randomBytes(1000)
  const u = await uploadAll(api, 'concurrent', 'c.bin', data, token)

  const completed = await api('POST', `uploads/${u.id}/complete`, { stage: true })
  assert.equal(completed.status, 200, completed.text)
  const completeResults = await Promise.all([
    api('POST', `uploads/${u.id}/complete`, {}),
    api('POST', `uploads/${u.id}/complete`, {}),
  ])
  assert.deepEqual(completeResults.map((r) => r.status).sort(), [200, 201])
  assert.equal((await api('GET', 'artifacts/concurrent')).body.versions.length, 2)

  const staged = await uploadAll(api, 'concurrent', 'd.bin', data, token)
  assert.equal((await api('POST', `uploads/${staged.id}/complete`, { stage: true })).status, 200)
  const versionResults = await Promise.all([
    api('POST', 'artifacts/concurrent/versions', { uploads: [staged.id] }),
    api('POST', 'artifacts/concurrent/versions', { uploads: [staged.id] }),
  ])
  assert.deepEqual(versionResults.map((r) => r.status).sort(), [200, 201])
  assert.equal((await api('GET', 'artifacts/concurrent')).body.versions.length, 3)
})

test('open uploads are limited, and expired ones release their slot and their reservation', async () => {
  await api('POST', 'artifacts', { title: 'Open limit', slug: 'open-limit', html: html('Open limit') })
  const used = (await api('GET', 'storage')).body.usedBytes
  const digest = sha(Buffer.alloc(0))
  const big = await api('POST', 'artifacts/open-limit/uploads', { path: 'big.bin', size: CAP - used - 1000, sha256: digest })
  assert.equal(big.status, 201, big.text)
  assert.equal((await api('POST', 'artifacts/open-limit/uploads', { path: 'more.bin', size: 2000, sha256: digest })).status, 507)
  const opened = [big.body.id]
  for (let i = 0; ; i++) {
    const r = await api('POST', 'artifacts/open-limit/uploads', { path: `s${i}.bin`, size: 10, sha256: digest })
    if (r.status !== 201) {
      assert.equal(r.status, 429, r.text)
      assert.equal(r.body.error.code, 'upload_limit')
      break
    }
    opened.push(r.body.id)
    assert.ok(opened.length <= 16, 'a small limit')
  }
  // The 24 h expiry, brought forward.
  await services.pool.query("UPDATE artifacts.uploads SET expires_at = now() - interval '1 second' WHERE id = ANY($1)", [opened])
  const again = await api('POST', 'artifacts/open-limit/uploads', { path: 'big.bin', size: CAP - used - 1000, sha256: digest })
  assert.equal(again.status, 201, again.text)
  assert.notEqual(again.body.id, big.body.id)
  assert.equal((await api('GET', `uploads/${big.body.id}`)).status, 404)
  assert.equal((await api('DELETE', `uploads/${again.body.id}`)).status, 200)
})

test('a limited token uploads large files to its own artifact through the CLI, and cannot touch other uploads', { timeout: 60000 }, async () => {
  const limTok = await mintToken('limited-uploader', true)
  const lim = agent(limTok)
  const env = cliEnv(limTok)
  const big = crypto.randomBytes(17 * MB)
  const dir = folder({ 'index.html': html('Limited big'), 'v.bin': big })
  const pub = await cliJson(env, 'publish', dir, '--slug', 'limited-big')
  assert.equal(pub.access.kind, 'restricted')
  assert.deepEqual(pub.versions.map((v) => v.version), [1])
  assert.equal(pub.files.find((f) => f.path === 'v.bin').sha256, sha(big))
  const up = await cliJson(env, 'upload', 'limited-big', path.join(dir, 'v.bin'), '--path', 'w.bin')
  assert.equal(up.url, `${ORIGIN.app}/limited-big`)
  assert.equal(up.version, 2)

  await api('POST', 'artifacts', { title: 'Others', slug: 'others-uploads', html: html('Others') })
  const data = crypto.randomBytes(100)
  const theirs = (await api('POST', 'artifacts/others-uploads/uploads', { path: 'o.bin', size: 100, sha256: sha(data) })).body
  assert.equal((await lim('POST', 'artifacts/others-uploads/uploads', { path: 'o.bin', size: 100 })).status, 404)
  assert.equal((await lim('GET', `uploads/${theirs.id}`)).status, 404)
  assert.equal((await putPart(theirs.id, 1, data, limTok)).status, 404)
  assert.equal((await lim('POST', `uploads/${theirs.id}/complete`, {})).status, 404)
  assert.equal((await lim('DELETE', `uploads/${theirs.id}`)).status, 404)
  assert.equal((await putPart(theirs.id, 1, data)).status, 200)
  assert.equal((await api('POST', `uploads/${theirs.id}/complete`, { stage: true })).status, 200)
  assert.equal((await lim('POST', 'artifacts/limited-big/versions', { uploads: [theirs.id] })).status, 400, 'another artifact\'s staged upload')
  assert.equal((await api('POST', 'artifacts/others-uploads/versions', { uploads: [theirs.id] })).status, 201)
})
