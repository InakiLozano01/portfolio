// Throwaway stack for the artifacts suites: PostgreSQL, MinIO and Redis containers on 127.0.0.1, a TLS SMTP sink
// that captures mail, and the production build of the app (NEXT_DIST_DIR=.next-test). Everything is removed on stop().
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import tls from 'node:tls'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
export const ROOT = path.resolve(import.meta.dirname, '../..')
const P = Number(process.env.ARTIFACTS_TEST_PORT || 55490)
export const PORTS = { app: P, pg: P + 1, minio: P + 2, redis: P + 3, smtp: P + 4 }
export const ORIGIN = {
  main: `http://localhost:${P}`,
  app: `http://artifacts.localhost:${P}`,
  content: `http://artifacts-content.localhost:${P}`,
}
export const ADMIN = { email: 'owner@example.test', password: 'owner-test-password' }
export const OWNER_INBOX = 'inbox@example.test'
const NAMES = { pg: 'artifacts-test-pg', minio: 'artifacts-test-minio', redis: 'artifacts-test-redis' }
const IMAGES = {
  pg: process.env.ARTIFACTS_TEST_PG_IMAGE || 'fleet-security/pg16-alpine:20261021',
  minio: process.env.ARTIFACTS_TEST_MINIO_IMAGE || 'minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e',
  redis: process.env.ARTIFACTS_TEST_REDIS_IMAGE || 'fleet-security/ca-portfolio-redis-1:20261021',
}
export const S3_ENV = {
  ARTIFACTS_S3_ENDPOINT: `http://127.0.0.1:${PORTS.minio}`, ARTIFACTS_S3_BUCKET: 'artifacts',
  ARTIFACTS_S3_ACCESS_KEY: 'artifacts-test', ARTIFACTS_S3_SECRET_KEY: 'artifacts-test-secret',
}
export const DATABASE_URL = `postgres://postgres:test@127.0.0.1:${PORTS.pg}/portfolio`
export const REDIS_URL = `redis://127.0.0.1:${PORTS.redis}`

const docker = (...args) => execFileSync('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function until(what, fn, ms = 60000) {
  const end = Date.now() + ms
  for (;;) {
    try { if (await fn()) return } catch {}
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`)
    await sleep(300)
  }
}
const tcpOpen = (port) => new Promise((res) => { const s = net.connect(port, '127.0.0.1', () => { s.end(); res(true) }); s.on('error', () => res(false)) })

export function removeContainers() {
  for (const n of Object.values(NAMES)) try { docker('rm', '-f', '-v', n) } catch {}
}

export async function startServices() {
  removeContainers()
  docker('run', '-d', '--name', NAMES.pg, '-p', `127.0.0.1:${PORTS.pg}:5432`, '--tmpfs', '/var/lib/postgresql/data',
    '-e', 'POSTGRES_PASSWORD=test', '-e', 'POSTGRES_DB=portfolio', IMAGES.pg)
  docker('run', '-d', '--name', NAMES.minio, '-p', `127.0.0.1:${PORTS.minio}:9000`, '--tmpfs', '/data',
    '-e', `MINIO_ROOT_USER=${S3_ENV.ARTIFACTS_S3_ACCESS_KEY}`, '-e', `MINIO_ROOT_PASSWORD=${S3_ENV.ARTIFACTS_S3_SECRET_KEY}`, IMAGES.minio, 'server', '/data')
  docker('run', '-d', '--name', NAMES.redis, '-p', `127.0.0.1:${PORTS.redis}:6379`, IMAGES.redis, 'redis-server', '--save', '')
  Object.assign(process.env, S3_ENV, { DATABASE_URL, REDIS_URL })
  const { Client } = require('pg')
  await until('postgres', async () => { const c = new Client({ connectionString: DATABASE_URL }); await c.connect(); await c.end(); return true })
  await until('minio', async () => (await fetch(`${S3_ENV.ARTIFACTS_S3_ENDPOINT}/minio/health/ready`)).ok)
  await until('redis', () => tcpOpen(PORTS.redis))
  const store = require(path.join(ROOT, 'lib/postgres-store.js'))
  await store.migrateSchema()
  await store.pool().query(fs.readFileSync(path.join(ROOT, 'lib/artifacts/schema.sql'), 'utf8'))
  require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'Node16', moduleResolution: 'node16', rootDir: ROOT } })
  const Admin = require(path.join(ROOT, 'models/Admin.ts')).default
  await Admin.create({ email: ADMIN.email, name: 'Owner', password: ADMIN.password })
  const { ensureBucket } = await import(path.join(ROOT, 'lib/artifacts/s3.mjs'))
  await ensureBucket()
  return { pool: store.pool(), Admin }
}

// ---------- mail sink: implicit-TLS SMTP that keeps every message ----------

export async function startMailSink(dir) {
  const key = path.join(dir, 'smtp.key')
  const cert = path.join(dir, 'smtp.crt')
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' })
  const messages = []
  const server = tls.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, (sock) => {
    let buf = ''
    let data = null
    let rcpt = []
    sock.write('220 sink ESMTP\r\n')
    sock.on('data', (chunk) => {
      buf += chunk.toString('latin1')
      for (;;) {
        if (data !== null) {
          const end = buf.indexOf('\r\n.\r\n')
          if (end < 0) return
          data += buf.slice(0, end)
          buf = buf.slice(end + 5)
          messages.push(parseMail(data, rcpt))
          data = null
          rcpt = []
          sock.write('250 queued\r\n')
          continue
        }
        const nl = buf.indexOf('\r\n')
        if (nl < 0) return
        const line = buf.slice(0, nl)
        buf = buf.slice(nl + 2)
        const cmd = line.slice(0, 4).toUpperCase()
        if (cmd === 'EHLO' || cmd === 'HELO') sock.write('250-sink\r\n250 AUTH PLAIN LOGIN\r\n')
        else if (cmd === 'AUTH') sock.write('235 ok\r\n')
        else if (cmd === 'RCPT') { rcpt.push(/<([^>]+)>/.exec(line)?.[1]); sock.write('250 ok\r\n') }
        else if (cmd === 'DATA') { data = ''; sock.write('354 go\r\n') }
        else if (cmd === 'QUIT') { sock.end('221 bye\r\n'); return }
        else sock.write('250 ok\r\n')
      }
    })
    sock.on('error', () => {})
  })
  await new Promise((r) => server.listen(PORTS.smtp, '127.0.0.1', r))
  return { messages, cert, close: () => server.close() }
}

const qp = (s) => s.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
function parseMail(raw, to) {
  const subject = /^Subject: (.*(?:\r\n[ \t].*)*)/m.exec(raw)?.[1].replace(/\r\n[ \t]/g, ' ') ?? ''
  const decodedSubject = subject.replace(/=\?utf-8\?([QB])\?([^?]*)\?=/gi, (_, e, t) =>
    e.toUpperCase() === 'B' ? Buffer.from(t, 'base64').toString('utf8') : Buffer.from(qp(t.replace(/_/g, ' ')), 'latin1').toString('utf8'))
  const parts = raw.split(/\r\n--[^\r\n]+\r\n/)
  let text = ''
  for (const part of parts) {
    if (!/Content-Type: text\/plain/i.test(part)) continue
    const body = part.slice(part.indexOf('\r\n\r\n') + 4)
    text = /Content-Transfer-Encoding: base64/i.test(part) ? Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8')
      : /quoted-printable/i.test(part) ? Buffer.from(qp(body), 'latin1').toString('utf8') : body
  }
  return { to, subject: decodedSubject, text, links: [...text.matchAll(/https?:\/\/[^\s"<>]+/g)].map((m) => m[0]) }
}

// ---------- the app ----------

export async function startApp(env = {}) {
  const dist = path.join(ROOT, '.next-test')
  if (!fs.existsSync(path.join(dist, 'BUILD_ID'))) throw new Error('Build first: NEXT_DIST_DIR=.next-test npx next build')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-test-'))
  const mail = await startMailSink(tmp)
  const log = fs.openSync(path.join(tmp, 'app.log'), 'w')
  const app = spawn(process.execPath, [path.join(ROOT, 'node_modules/next/dist/bin/next'), 'start', '-p', String(PORTS.app), '-H', '::'], {
    cwd: ROOT,
    stdio: ['ignore', log, log],
    env: {
      PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'production', NEXT_DIST_DIR: '.next-test', NEXT_TELEMETRY_DISABLED: '1',
      DATABASE_URL, REDIS_URL, ...S3_ENV,
      NEXTAUTH_SECRET: 'artifacts-test-nextauth-secret', NEXTAUTH_URL: ORIGIN.main,
      ARTIFACTS_APP_ORIGIN: ORIGIN.app, ARTIFACTS_CONTENT_ORIGIN: ORIGIN.content,
      SMTP_SERVER: 'localhost', SMTP_PORT: String(PORTS.smtp), SMTP_ENCRYPT: 'SSL', SMTP_USERNAME: 'sink', SMTP_PASSWORD: 'sink',
      CONTACT_MAIL_FROM: 'artifacts@example.test', CONTACT_MAIL_TO: OWNER_INBOX, NODE_EXTRA_CA_CERTS: mail.cert,
      ...env,
    },
  })
  const stop = async () => {
    app.kill('SIGTERM')
    await new Promise((r) => (app.exitCode != null ? r() : app.once('exit', r)))
    mail.close()
    fs.rmSync(tmp, { recursive: true, force: true })
  }
  try {
    await until('app', async () => (await fetch(`${ORIGIN.app}/health`)).ok, 90000)
  } catch (e) {
    process.stderr.write(fs.readFileSync(path.join(tmp, 'app.log'), 'utf8').slice(-4000))
    await stop()
    throw e
  }
  return { mail, logFile: path.join(tmp, 'app.log'), stop }
}

/** Waits for a captured message matching `pred` and returns it. */
export async function mailTo(mail, pred, ms = 15000) {
  let found
  await until('mail', () => (found = mail.messages.find(pred)), ms)
  return found
}

// ---------- an HTTP client with a cookie jar per host, like one browser ----------

export class Browser {
  jar = new Map()
  async req(url, { method = 'GET', headers = {}, body, json, shell = false, redirect = 'manual' } = {}) {
    const u = new URL(url)
    const h = { ...headers }
    const cookies = this.jar.get(u.host)
    if (cookies?.size) h.cookie = [...cookies].map(([k, v]) => `${k}=${v}`).join('; ')
    if (json !== undefined) { h['content-type'] = 'application/json'; body = JSON.stringify(json) }
    if (shell) {
      h['x-artifact-shell'] = '1'
      if (method !== 'GET') h.origin = ORIGIN.app
      if (this.csrf) h['x-artifact-csrf'] = this.csrf
    }
    const res = await fetch(url, { method, headers: h, body, redirect })
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';')
      const i = pair.indexOf('=')
      const jar = this.jar.get(u.host) ?? new Map()
      if (/Max-Age=0/i.test(c) || pair.slice(i + 1) === '') jar.delete(pair.slice(0, i))
      else jar.set(pair.slice(0, i), pair.slice(i + 1))
      this.jar.set(u.host, jar)
    }
    const buf = Buffer.from(await res.arrayBuffer())
    let parsed
    try { parsed = JSON.parse(buf.toString()) } catch {}
    return { status: res.status, headers: res.headers, buf, text: buf.toString(), body: parsed }
  }
  /** Opens the viewer shell and returns its boot data and the content URL in the iframe, like a browser page load. */
  async open(slug) {
    const r = await this.req(`${ORIGIN.app}/${slug}`)
    const boot = JSON.parse(/<script type="application\/json" id="boot">([^<]*)<\/script>/.exec(r.text)[1])
    const iframe = /<iframe id="f" src="([^"]+)"/.exec(r.text)?.[1]?.replace(/&amp;/g, '&') ?? null
    this.csrf = boot.csrf
    // `base` is the capability directory relative asset URLs resolve against.
    return { ...r, boot, iframe, base: iframe?.replace(/index\.html$/, '') ?? null }
  }
  signIn(email, password) {
    return this.req(`${ORIGIN.app}/api/session`, { method: 'POST', shell: true, json: { email, password } })
  }
}

export function agent(token) {
  const b = new Browser()
  return (method, p, json, headers = {}) =>
    b.req(`${ORIGIN.app}/api/v1/${p}`, { method, json, headers: { authorization: `Bearer ${token}`, ...headers } })
}
