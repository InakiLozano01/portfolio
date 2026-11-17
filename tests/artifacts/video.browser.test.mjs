// Seam C for video: an artifact with uploaded videos in a real Chromium against the Seam A stack, with the encoder
// run once in its image. Also records the Referer that requests from inside the sandboxed artifact carry to a third party.
// Run: NEXT_DIST_DIR=.next-test npx next build && node --test tests/artifacts/video.browser.test.mjs
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { ADMIN, Browser, DATABASE_URL, ORIGIN, REDIS_URL, ROOT, S3_ENV, agent, removeContainers, startApp, startServices } from './stack.mjs'

const run = promisify(execFile)
const BROWSER_IMAGE = process.env.ARTIFACTS_BROWSER_IMAGE || 'journal_app-browser-runner:rollback-f662c40260'
const ENCODER_IMAGE = process.env.ARTIFACTS_ENCODER_IMAGE || 'portfolio-invoice-notes:20261102'
let services, app, api, dir, thirdParty, third
const hits = []

// Stands in for YouTube and the like: records the Referer of every request, including what an embedded page reads
// from document.referrer.
const EMBED = '<!doctype html><script>fetch("/report?doc=" + encodeURIComponent(document.referrer))</script>'
function startThirdParty() {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x')
    hits.push({ path: u.pathname, from: u.searchParams.get('from'), referer: req.headers.referer ?? null, doc: u.searchParams.get('doc') })
    res.setHeader('access-control-allow-origin', '*')
    if (u.pathname === '/embed') res.setHeader('content-type', 'text/html')
    res.end(u.pathname === '/embed' ? EMBED : '')
  })
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)))
}

const page = (videos) => `<!doctype html><html><head><title>Video</title></head><body>${videos}
<img alt="" src="${third}/pixel?from=img"><iframe src="${third}/embed?from=iframe"></iframe>
<script>fetch(${JSON.stringify(`${third}/api?from=fetch`)})</script></body></html>`

before(async () => {
  thirdParty = await startThirdParty()
  third = `http://third-party.localhost:${thirdParty.address().port}`
  services = await startServices()
  app = await startApp()
  const owner = new Browser()
  await owner.signIn(ADMIN.email, ADMIN.password)
  api = agent((await owner.req(`${ORIGIN.app}/api/v1/tokens`, { method: 'POST', json: { name: 'video' }, headers: { origin: ORIGIN.app } })).body.token)

  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-video-browser-'))
  await run('docker', ['run', '--rm', '--user', `${process.getuid()}:${process.getgid()}`, '-v', `${dir}:/w`, '--entrypoint', 'ffmpeg', ENCODER_IMAGE,
    '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=24', '-f', 'lavfi', '-i', 'sine', '-t', '8', '-shortest',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '/w/clip.mp4'])
  const files = [
    { path: 'media/clip.mp4', base64: fs.readFileSync(path.join(dir, 'clip.mp4')).toString('base64') },
    { path: 'media/broken.mp4', base64: crypto.randomBytes(40000).toString('base64') },
  ]
  const html = page('<video id="ready" data-artifact-video="media/clip.mp4" controls playsinline></video><video id="broken" data-artifact-video="media/broken.mp4"></video>')
  assert.equal((await api('POST', 'artifacts', { title: 'Video', slug: 'video-ready', html, files, access: { kind: 'link', role: 'viewer' } })).status, 201)
  const env = { ...S3_ENV, DATABASE_URL, REDIS_URL }
  await run('docker', ['run', '--rm', '--network', 'host', '-v', `${ROOT}:/w:ro`, ...Object.entries(env).flatMap(([k, v]) => ['-e', `${k}=${v}`]),
    '--entrypoint', 'node', ENCODER_IMAGE, '/w/scripts/artifacts-encoder.mjs', '--once'], { maxBuffer: 1 << 24 })
  // Created after the encoder ran, so it stays pending.
  assert.equal((await api('POST', 'artifacts', { title: 'Pending', slug: 'video-pending', access: { kind: 'link', role: 'viewer' },
    html: '<!doctype html><video id="pending" data-artifact-video="talk.mp4"></video>', files: [{ path: 'talk.mp4', base64: crypto.randomBytes(4096).toString('base64') }] })).status, 201)
}, { timeout: 300000 })

after(async () => {
  await app?.stop()
  await services?.pool.end()
  removeContainers()
  thirdParty?.close()
  if (dir) fs.rmSync(dir, { recursive: true, force: true })
})

let seen
test('Chromium plays, seeks and shows the poster of an encoded video; failed and pending videos say so', { timeout: 240000 }, async () => {
  try {
    const { stdout } = await run('docker', ['run', '--rm', '--network', 'host', '-v', `${import.meta.dirname}:/t:ro`,
      '-e', `APP=${ORIGIN.app}`, '-e', 'READY_SLUG=video-ready', '-e', 'PENDING_SLUG=video-pending',
      '--entrypoint', 'node', BROWSER_IMAGE, '/t/video-browser-driver.cjs'], { maxBuffer: 1 << 24, timeout: 200000 })
    seen = JSON.parse(stdout.trim().split('\n').pop())
  } catch (e) {
    assert.fail(`browser driver failed:\n${e.stdout}\n${e.stderr}`)
  }
  for (const [mode, v] of Object.entries({ native: seen.native, hlsJs: seen.hlsJs })) {
    assert.match(v.posterUrl, /\/media\/clip\.mp4\/hls\/poster\.jpg$/, mode)
    assert.deepEqual(v.poster, [640, 360], `${mode}: poster image loads`)
    assert.equal(v.height, 360, mode)
    assert.ok(Math.abs(v.duration - 8) < 0.5, `${mode}: duration ${v.duration}`)
    assert.ok(v.played > 0.5, `${mode}: played to ${v.played}`)
    assert.ok(Math.abs(v.seekedTo - 3) < 0.1, `${mode}: seeked to ${v.seekedTo}`)
    assert.equal(v.brokenNote, 'El video no está disponible.', mode)
  }
  // Without native HLS the client loads hls.js, which feeds the element through Media Source Extensions.
  assert.equal(seen.hlsJs.hlsJs, true)
  assert.match(seen.hlsJs.src, /^blob:/)
  assert.equal(seen.native.hlsJs, false)
  assert.match(seen.native.src, /\/hls\/master\.m3u8$/)
  assert.match(seen.pendingNote, /se está procesando/)
})

// Observed in Chromium 156: a document sandboxed without allow-same-origin sends no Referer at all, whatever its
// Referrer-Policy says, so the capability cannot leak, and embedded players get no referrer either.
test('requests from inside the artifact carry no referrer to a third party, so never the capability path', () => {
  assert.ok(seen, 'needs the browser run')
  const capability = new URL(seen.contentUrl).pathname
  assert.match(capability, /^\/c\/[^/]+\//)
  for (const from of ['img', 'fetch', 'iframe']) {
    const got = hits.filter((h) => h.from === from)
    assert.ok(got.length, `no ${from} request reached the third party`)
    for (const h of got) assert.equal(h.referer, null, from)
  }
  // What an embedded player reads in its own page.
  const docs = hits.filter((h) => h.path === '/report').map((h) => h.doc)
  assert.ok(docs.length)
  for (const d of docs) assert.equal(d, '')
  for (const h of hits) assert.ok(!`${h.referer}${h.doc}`.includes(capability), JSON.stringify(h))
})
