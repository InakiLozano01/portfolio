#!/usr/bin/env node
// Artifacts CLI: every agent API operation, with resumable multipart uploads for large files. No dependencies.
// Token: ~/.config/artifacts/token (mode 600) or ARTIFACTS_TOKEN_FILE. Server: ARTIFACTS_URL (default https://artifacts.inakilozano.com).
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const BASE = (process.env.ARTIFACTS_URL || 'https://artifacts.inakilozano.com').replace(/\/$/, '')
const INLINE_MAX = 4 << 20 // larger files go through an upload
const INLINE_BATCH = 24 << 20 // keeps one JSON request well under the 40 MB body limit

const USAGE = `usage: artifacts <command> [args] [--flags]   (every command prints JSON with the artifact's url)
  publish <dir|file.html> [--slug s] [--title t] [--note n]   create, or publish a new version that matches the folder
  list | get <ref> | delete <ref> --yes
  rename <ref> [--title t] [--slug s]
  rollback <ref> <version>
  upload <ref> <file> [--path p]                     one file (resumable) as a new version
  access <ref> restricted|link|password [--role viewer|responder|editor] [--password p | --generate]
  shares <ref> | share <ref> <email> <role> [--alias a] [--no-email] | unshare <ref> <email> | resend <ref> <email>
  accounts | alias <email> <alias> | delete-account <email> --yes | reset <email> [--no-email]
  state get <ref> [--rev n] | state put <ref> (<file.json> | --json '<json>') [--base-rev n] | state history <ref>
  responses settings <ref> [--who anonymous|declared|account] [--open|--closed] [--feedback none|score|answers] [--notify|--no-notify]
  responses export <ref> [--csv] | responses delete <ref> <id>
  answer-key <ref> (<file.json> | --json '<json>' | --delete | --show)
  storage`

function parseArgs(argv) {
  const pos = []
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) { pos.push(a); continue }
    const name = a.slice(2)
    const next = argv[i + 1]
    if (next !== undefined && !next.startsWith('--') && !['yes', 'generate', 'no-email', 'open', 'closed', 'notify', 'no-notify', 'csv', 'delete', 'show'].includes(name)) { flags[name] = next; i++ }
    else flags[name] = true
  }
  return { pos, flags }
}

function readToken() {
  const file = process.env.ARTIFACTS_TOKEN_FILE || path.join(os.homedir(), '.config/artifacts/token')
  let st
  try { st = fs.statSync(file) } catch { die(`No token file at ${file}. Create one in the admin console (Artifacts → API tokens) and save it there with mode 600.`) }
  if ((st.mode & 0o077) !== 0) die(`${file} must have mode 600 (chmod 600 ${file})`)
  return fs.readFileSync(file, 'utf8').trim()
}

function die(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

let TOKEN
async function call(method, p, { json, body, headers = {}, raw = false } = {}) {
  TOKEN ??= readToken()
  const res = await fetch(`${BASE}/api/v1/${p}`, {
    method, body: json !== undefined ? JSON.stringify(json) : body,
    headers: { authorization: `Bearer ${TOKEN}`, ...(json !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
  })
  const text = await res.text()
  if (!res.ok) {
    let msg = text
    try { msg = JSON.parse(text).error.message } catch {}
    const err = new Error(`${method} ${p}: ${res.status} ${msg}`)
    err.status = res.status
    throw err
  }
  return raw ? text : JSON.parse(text)
}

const enc = encodeURIComponent
const out = (v) => process.stdout.write(`${typeof v === 'string' ? v : JSON.stringify(v, null, 2)}\n`)
/** Every artifact command answers with the artifact's URL. */
const withUrl = (ref, v) => (Array.isArray(v) ? { url: `${BASE}/${ref}`, items: v } : typeof v === 'string' || v.url ? v : { url: `${BASE}/${ref}`, ...v })
const sha256File = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('.')) return []
    const full = path.join(dir, e.name)
    return e.isDirectory() ? walk(full, base) : e.isFile() ? [{ full, rel: path.relative(base, full).split(path.sep).join('/') }] : []
  })
}

/** Resumable upload: the fingerprint lets a rerun find the unfinished upload and send only the missing parts. */
async function upload(ref, file, rel, { stage }) {
  const st = fs.statSync(file)
  const fingerprint = `${st.size}:${st.mtimeMs}:${rel}`
  const u = await call('POST', `artifacts/${enc(ref)}/uploads`, { json: { path: rel, size: st.size, fingerprint } })
  const have = new Set(u.received)
  const fd = fs.openSync(file, 'r')
  try {
    for (let n = 1; n <= u.partCount; n++) {
      if (have.has(n)) continue
      const len = Math.min(u.partSize, st.size - (n - 1) * u.partSize)
      const buf = Buffer.alloc(len)
      fs.readSync(fd, buf, 0, len, (n - 1) * u.partSize)
      for (let attempt = 1; ; attempt++) {
        try { await call('PUT', `uploads/${u.id}/parts/${n}`, { body: buf }); break } catch (e) {
          if (attempt >= 4 || (e.status && e.status < 500)) throw e
          await new Promise((r) => setTimeout(r, 1000 * attempt))
        }
      }
      process.stderr.write(`  ${rel}: part ${n}/${u.partCount}\n`)
    }
  } finally {
    fs.closeSync(fd)
  }
  return call('POST', `uploads/${u.id}/complete`, { json: { stage } })
}

const typeOf = (p) => (/\.(mp4|webm|mov|m4v|mkv)$/i.test(p) ? `video/${{ mov: 'quicktime', mkv: 'x-matroska', m4v: 'mp4' }[p.split('.').pop().toLowerCase()] || p.split('.').pop().toLowerCase()}` : undefined)

async function publish(target, flags) {
  const isFile = fs.statSync(target).isFile()
  const files = isFile ? [{ full: target, rel: 'index.html' }] : walk(target)
  if (!files.some((f) => f.rel === 'index.html')) die('The folder needs an index.html')
  let current = null
  if (flags.slug) current = await call('GET', `artifacts/${enc(flags.slug)}`).catch((e) => (e.status === 404 ? null : Promise.reject(e)))
  const known = new Map((current?.files || []).map((f) => [f.path, f.sha256]))
  const inline = []
  const big = []
  let batch = 0
  for (const f of files) {
    const size = fs.statSync(f.full).size
    if (current && known.get(f.rel) && known.get(f.rel) === sha256File(f.full)) continue // unchanged
    if (f.rel !== 'index.html' && (size > INLINE_MAX || typeOf(f.rel) || batch + size > INLINE_BATCH)) big.push(f)
    else { inline.push({ path: f.rel, base64: fs.readFileSync(f.full).toString('base64') }); batch += size }
  }
  const removeFiles = current ? [...known.keys()].filter((p) => !files.some((f) => f.rel === p)) : []
  if (!current) {
    const title = flags.title || (/<title>([^<]*)<\/title>/i.exec(fs.readFileSync(files.find((f) => f.rel === 'index.html').full, 'utf8'))?.[1].trim()) || path.basename(path.resolve(target))
    current = await call('POST', 'artifacts', { json: { title, slug: flags.slug, note: flags.note || 'initial', files: inline } })
    if (!big.length) return current
    inline.length = 0
  }
  const uploads = []
  for (const f of big) uploads.push((await upload(current.slug, f.full, f.rel, { stage: true })).id)
  return call('POST', `artifacts/${enc(current.slug)}/versions`, { json: { files: inline, uploads, removeFiles, note: flags.note ?? null } })
}

const readJsonArg = (pos, flags) => JSON.parse(flags.json ?? fs.readFileSync(pos ?? die('give a JSON file or --json'), 'utf8'))

async function main() {
  const { pos, flags } = parseArgs(process.argv.slice(2))
  const [cmd, a1, a2, a3] = pos
  switch (cmd) {
    case 'publish': return out(await publish(a1 ?? die(USAGE), flags))
    case 'list': return out(await call('GET', 'artifacts'))
    case 'get': return out(withUrl(a1, await call('GET', `artifacts/${enc(a1)}`)))
    case 'delete': if (!flags.yes) die('add --yes to delete'); return out(withUrl(a1, await call('DELETE', `artifacts/${enc(a1)}`)))
    case 'rename': return out(withUrl(a1, await call('PATCH', `artifacts/${enc(a1)}`, { json: { title: flags.title, slug: flags.slug } })))
    case 'rollback': return out(withUrl(a1, await call('POST', `artifacts/${enc(a1)}/rollback`, { json: { version: Number(a2) } })))
    case 'upload': return out(withUrl(a1, await upload(a1, a2, flags.path || path.basename(a2), { stage: false })))
    case 'access': return out(withUrl(a1, await call('PUT', `artifacts/${enc(a1)}/access`, { json: { kind: a2, role: flags.role, password: flags.password, generatePassword: !!flags.generate || undefined } })))
    case 'shares': return out(withUrl(a1, await call('GET', `artifacts/${enc(a1)}/shares`)))
    case 'share': return out(withUrl(a1, await call('PUT', `artifacts/${enc(a1)}/shares`, { json: { email: a2, role: a3, alias: flags.alias, notify: !flags['no-email'] } })))
    case 'unshare': return out(withUrl(a1, await call('DELETE', `artifacts/${enc(a1)}/shares/${enc(a2)}`)))
    case 'resend': return out(withUrl(a1, await call('POST', `artifacts/${enc(a1)}/shares/${enc(a2)}/resend`)))
    case 'accounts': return out(await call('GET', 'accounts'))
    case 'alias': return out(await call('PATCH', `accounts/${enc(a1)}`, { json: { alias: a2 } }))
    case 'delete-account': if (!flags.yes) die('add --yes to delete'); return out(await call('DELETE', `accounts/${enc(a1)}`))
    case 'reset': return out(await call('POST', `accounts/${enc(a1)}/reset`, { json: { notify: !flags['no-email'] } }))
    case 'state':
      if (a1 === 'get') return out(withUrl(a2, await call('GET', `artifacts/${enc(a2)}/state${flags.rev ? `?rev=${Number(flags.rev)}` : ''}`)))
      if (a1 === 'put') return out(withUrl(a2, await call('PUT', `artifacts/${enc(a2)}/state`, { json: { state: readJsonArg(a3, flags), baseRev: flags['base-rev'] != null ? Number(flags['base-rev']) : undefined } })))
      if (a1 === 'history') return out(withUrl(a2, await call('GET', `artifacts/${enc(a2)}/state/history`)))
      break
    case 'responses':
      if (a1 === 'export') return out(withUrl(a2, await call('GET', `artifacts/${enc(a2)}/responses${flags.csv ? '?format=csv' : ''}`, { raw: !!flags.csv })))
      if (a1 === 'delete') return out(withUrl(a2, await call('DELETE', `artifacts/${enc(a2)}/responses/${enc(a3)}`)))
      if (a1 === 'settings') {
        const responses = { who: flags.who, feedback: flags.feedback, open: flags.open ? true : flags.closed ? false : undefined, notifyOwner: flags.notify ? true : flags['no-notify'] ? false : undefined }
        return out(withUrl(a2, await call('PATCH', `artifacts/${enc(a2)}`, { json: { responses } })))
      }
      break
    case 'answer-key':
      if (flags.delete) return out(withUrl(a1, await call('DELETE', `artifacts/${enc(a1)}/answer-key`)))
      if (flags.show) return out(withUrl(a1, await call('GET', `artifacts/${enc(a1)}/answer-key`)))
      return out(withUrl(a1, await call('PUT', `artifacts/${enc(a1)}/answer-key`, { json: { key: readJsonArg(a2, flags) } })))
    case 'storage': return out(await call('GET', 'storage'))
  }
  die(USAGE)
}

main().catch((e) => die(e.message))
