// Artifact server: agent API (bearer), guest editing (cookie+CSRF), sandboxed content origin.
// Zero npm dependencies: node:http, node:sqlite, crypto.argon2.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { DatabaseSync } from 'node:sqlite';
import * as L from './lib.mjs';
import { clientJs, SHELL_JS, SHELL_CSS } from './client.mjs';

const CFG = {
  port: Number(process.env.PORT || 3000),
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:3000',
  contentOrigin: process.env.CONTENT_ORIGIN || 'http://127.0.0.1:3000',
};
const APP_HOST = new URL(CFG.appOrigin).host;
const CONTENT_HOST = new URL(CFG.contentOrigin).host;
const LIMITS = { body: 40 << 20, file: 15 << 20, version: 100 << 20, files: 300, state: 2 << 20, stateRevs: 500 };
function envInt(name, fallback, min = 1) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < min) { console.error(`${name} must be an integer >= ${min}, got ${JSON.stringify(raw)}`); process.exit(2); }
  return n;
}
const TEST_MODE = process.env.NODE_ENV === 'test' || process.env.ARTIFACTS_TEST_MODE === '1';
const UPLOAD = {
  maxBytes: envInt('ARTIFACTS_MAX_UPLOAD_BYTES', 2 ** 30),
  partBytes: TEST_MODE ? envInt('ARTIFACTS_UPLOAD_PART_BYTES', 8 << 20) : 8 << 20,
  versionBytes: envInt('ARTIFACTS_MAX_UPLOAD_VERSION_BYTES', 2 ** 31),
  freeMargin: envInt('ARTIFACTS_MIN_FREE_BYTES', 2 ** 30, 0),
  sessions: 8, openBytes: 4 * 2 ** 30, ttl: 864e5,
};
const UPLOAD_TYPES = new Set(['application/pdf', 'text/html; charset=utf-8', 'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/json', 'text/csv', 'text/plain', 'application/zip', 'application/octet-stream']);
const MAGIC = Object.fromEntries(Object.entries({ 'application/pdf': '%PDF-', 'image/png': '\x89PNG\r\n\x1a\n', 'image/jpeg': '\xff\xd8\xff',
  'application/zip': 'PK\x03\x04' }).map(([t, m]) => [t, Buffer.from(m, 'latin1')]));
const SESSION_MS = 30 * 864e5;
const CONTENT_TTL = 12 * 3600;
const ROBOTS = 'noindex, nofollow, noarchive';
const SANDBOX = 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads';
const CLIENT_JS = clientJs(CFG.appOrigin);

// ---------- storage ----------
const BLOBS = path.join(CFG.dataDir, 'blobs');
fs.mkdirSync(BLOBS, { recursive: true });
const db = new DatabaseSync(path.join(CFG.dataDir, 'artifacts.db'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS api_tokens(id INTEGER PRIMARY KEY, name TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL, last_used_at TEXT, revoked_at TEXT);
CREATE TABLE IF NOT EXISTS artifacts(id INTEGER PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','private')), current_version INTEGER NOT NULL DEFAULT 0,
  cap_epoch INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS versions(id INTEGER PRIMARY KEY, artifact_id INTEGER NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL, note TEXT, created_by TEXT, created_at TEXT NOT NULL, UNIQUE(artifact_id, version));
CREATE TABLE IF NOT EXISTS files(version_id INTEGER NOT NULL REFERENCES versions(id) ON DELETE CASCADE, path TEXT NOT NULL,
  blob TEXT NOT NULL, size INTEGER NOT NULL, content_type TEXT NOT NULL, PRIMARY KEY(version_id, path));
CREATE TABLE IF NOT EXISTS credentials(id INTEGER PRIMARY KEY, artifact_id INTEGER NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  username TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(artifact_id, username));
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, artifact_id INTEGER NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  credential_id INTEGER NOT NULL REFERENCES credentials(id) ON DELETE CASCADE, csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS states(id INTEGER PRIMARY KEY, artifact_id INTEGER NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  rev INTEGER NOT NULL, json TEXT NOT NULL, saved_by TEXT NOT NULL, saved_at TEXT NOT NULL, UNIQUE(artifact_id, rev));
CREATE TABLE IF NOT EXISTS uploads(id INTEGER PRIMARY KEY AUTOINCREMENT, -- ids are never reused, so a stale client cannot hit a newer session
  artifact_id INTEGER NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  path TEXT NOT NULL, size INTEGER NOT NULL, sha256 TEXT NOT NULL, content_type TEXT NOT NULL, part_size INTEGER NOT NULL, parts INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'open' CHECK(state IN ('open','completed')), version INTEGER,
  created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, created_by_token INTEGER NOT NULL, CHECK((state = 'completed') = (version IS NOT NULL)));
CREATE TABLE IF NOT EXISTS upload_parts(upload_id INTEGER NOT NULL REFERENCES uploads(id) ON DELETE CASCADE, n INTEGER NOT NULL,
  sha256 TEXT NOT NULL, size INTEGER NOT NULL, PRIMARY KEY(upload_id, n));`);
if (!db.prepare('PRAGMA table_info(api_tokens)').all().some((c) => c.name === 'private_only'))
  db.exec('ALTER TABLE api_tokens ADD COLUMN private_only INTEGER NOT NULL DEFAULT 0');
// NULL for artifacts created before ownership was tracked: private-only tokens cannot touch those.
if (!db.prepare('PRAGMA table_info(artifacts)').all().some((c) => c.name === 'created_by_token'))
  db.exec('ALTER TABLE artifacts ADD COLUMN created_by_token INTEGER');

const stmts = new Map();
const q = (sql) => stmts.get(sql) ?? stmts.set(sql, db.prepare(sql)).get(sql);
function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}
const now = () => new Date().toISOString();

let secret = q('SELECT value FROM settings WHERE key=?').get('content_secret')?.value;
if (!secret) q('INSERT INTO settings(key,value) VALUES(?,?)').run('content_secret', (secret = L.randomToken(32)));

const blobPath = (sha) => path.join(BLOBS, sha.slice(0, 2), sha);
function putBlob(buf) {
  const sha = L.sha256(buf);
  const p = blobPath(sha);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const tmp = `${p}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, p);
  }
  return sha;
}
function moveIntoBlobs(tmp, sha) {
  const p = blobPath(sha);
  if (fs.existsSync(p)) return fs.rmSync(tmp);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.renameSync(tmp, p);
}
function gcBlobs() {
  const live = new Set(q('SELECT DISTINCT blob FROM files').all().map((r) => r.blob));
  for (const dir of fs.readdirSync(BLOBS)) {
    for (const f of fs.readdirSync(path.join(BLOBS, dir))) if (!live.has(f)) fs.rmSync(path.join(BLOBS, dir, f), { force: true });
  }
}

// ---------- http helpers ----------
class HttpError extends Error {
  constructor(status, code, message, extra) { super(message); Object.assign(this, { status, code, extra }); }
}
const bad = (message) => new HttpError(400, 'bad_request', message);

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  const payload = isJson ? JSON.stringify(body) : body;
  res.writeHead(status, {
    'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(payload);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    if (Number(req.headers['content-length'] || 0) > limit) return reject(new HttpError(413, 'too_large', `Body exceeds ${limit} bytes`));
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size <= limit) chunks.push(c); });
    req.on('end', () => (size > limit ? reject(new HttpError(413, 'too_large', `Body exceeds ${limit} bytes`)) : resolve(Buffer.concat(chunks))));
    req.on('error', reject);
  });
}
async function readJson(req, limit) {
  const buf = await readBody(req, limit);
  try { const v = JSON.parse(buf.toString('utf8') || '{}'); if (v && typeof v === 'object' && !Array.isArray(v)) return v; } catch {}
  throw bad('Body must be a JSON object');
}
const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p.length === 2));
const clientIp = (req) => req.headers['x-real-ip'] || req.socket.remoteAddress || '?';

// ---------- domain ----------
const artifactUrl = (a) => `${CFG.appOrigin}/${a.slug}`;
function findArtifact(ref) {
  const a = /^\d+$/.test(ref) ? q('SELECT * FROM artifacts WHERE id=?').get(Number(ref)) : q('SELECT * FROM artifacts WHERE slug=?').get(ref);
  if (!a) throw new HttpError(404, 'not_found', 'Artifact not found');
  return a;
}
const versionRow = (a, v = a.current_version) => q('SELECT * FROM versions WHERE artifact_id=? AND version=?').get(a.id, v);

function checkSlug(slug, exceptId = 0) {
  if (typeof slug !== 'string' || !L.SLUG_RE.test(slug) || /^\d+$/.test(slug) || L.RESERVED_SLUGS.has(slug))
    throw bad('slug must be 1-80 chars of a-z, 0-9 and "-", contain a letter, and not be reserved');
  const taken = q('SELECT id FROM artifacts WHERE slug=?').get(slug);
  if (taken && taken.id !== exceptId) throw new HttpError(409, 'slug_taken', `Slug "${slug}" is already in use`);
  return slug;
}
function uniqueSlug(base) {
  for (let i = 1; ; i++) {
    const s = i === 1 ? base : `${base.slice(0, 74)}-${i}`;
    if (!L.RESERVED_SLUGS.has(s) && !/^\d+$/.test(s) && !q('SELECT 1 FROM artifacts WHERE slug=?').get(s)) return s;
  }
}
function checkTitle(t) {
  if (typeof t !== 'string' || !t.trim() || t.length > 200) throw bad('title must be a 1-200 char string');
  return t.trim();
}
function checkVisibility(v) {
  if (v !== 'public' && v !== 'private') throw bad('visibility must be "public" or "private"');
  return v;
}

// Normalizes {html, files:[{path, content|base64, contentType?}]} into [{path, buf, type}].
function parseFiles(body) {
  const out = [];
  if (body.html != null) {
    if (typeof body.html !== 'string') throw bad('html must be a string');
    out.push({ path: 'index.html', buf: Buffer.from(body.html), type: L.guessType('index.html') });
  }
  if (body.files != null) {
    if (!Array.isArray(body.files) || body.files.length > LIMITS.files) throw bad(`files must be an array of at most ${LIMITS.files}`);
    for (const f of body.files) out.push(fileEntry(f?.path, f, f?.contentType));
  }
  return out;
}
function fileEntry(p, f, contentType) {
  if (typeof p !== 'string' || p.length > 200 || !L.ASSET_PATH_RE.test(p)) throw bad(`invalid file path ${JSON.stringify(p)}`);
  let buf;
  if (Buffer.isBuffer(f)) buf = f;
  else if (typeof f?.content === 'string') buf = Buffer.from(f.content);
  else if (typeof f?.base64 === 'string') buf = Buffer.from(f.base64, 'base64');
  else throw bad(`file ${p} needs "content" (utf8) or "base64"`);
  if (buf.length > LIMITS.file) throw new HttpError(413, 'too_large', `file ${p} exceeds ${LIMITS.file} bytes`);
  const type = typeof contentType === 'string' && /^[\w.+-]+\/[\w.+-]+(;[\w =.-]*)?$/.test(contentType) ? contentType : L.guessType(p);
  return { path: p, buf, type };
}

// New immutable version = files of `fromVersionId` (or nothing) + `files` - `remove`.
// `files` items carry either `buf`, or `sha` + `size` of a blob already in the store. `inTx(version)` commits with the version.
// LIMITS.version caps the bytes one request adds; the whole version may reach UPLOAD.versionBytes (uploads add more than 100 MB).
function writeVersion(a, { fromVersionId, files = [], remove = [], note = null, by, inTx }) {
  const added = files.reduce((n, f) => n + (f.buf?.length ?? 0), 0);
  if (added > LIMITS.version) throw new HttpError(413, 'too_large', `request adds more than ${LIMITS.version} bytes`);
  const blobs = files.map((f) => (f.sha ? f : { ...f, sha: putBlob(f.buf), size: f.buf.length }));
  try { return commitVersion(a, { fromVersionId, blobs, remove, note, by, inTx }); } catch (e) {
    for (const b of blobs) if (!q('SELECT 1 FROM files WHERE blob=? LIMIT 1').get(b.sha)) fs.rmSync(blobPath(b.sha), { force: true });
    throw e;
  }
}
function commitVersion(a, { fromVersionId, blobs, remove, note, by, inTx }) {
  return tx(() => {
    const cur = q('SELECT current_version FROM artifacts WHERE id=?').get(a.id).current_version;
    const next = cur + 1;
    const vid = Number(q('INSERT INTO versions(artifact_id,version,note,created_by,created_at) VALUES(?,?,?,?,?)').run(a.id, next, note, by, now()).lastInsertRowid);
    if (fromVersionId) q('INSERT INTO files(version_id,path,blob,size,content_type) SELECT ?,path,blob,size,content_type FROM files WHERE version_id=?').run(vid, fromVersionId);
    for (const b of blobs) {
      q(`INSERT INTO files(version_id,path,blob,size,content_type) VALUES(?,?,?,?,?)
         ON CONFLICT(version_id,path) DO UPDATE SET blob=excluded.blob,size=excluded.size,content_type=excluded.content_type`).run(vid, b.path, b.sha, b.size, b.type);
    }
    for (const p of remove) q('DELETE FROM files WHERE version_id=? AND path=?').run(vid, p);
    const t = q('SELECT COUNT(*) n, COALESCE(SUM(size),0) bytes, SUM(path=\'index.html\') idx FROM files WHERE version_id=?').get(vid);
    if (!t.idx) throw bad('a version must contain index.html');
    if (t.bytes > UPLOAD.versionBytes) throw new HttpError(413, 'too_large', `version exceeds ${UPLOAD.versionBytes} bytes`);
    if (t.n > LIMITS.files) throw bad(`version exceeds ${LIMITS.files} files`);
    q('UPDATE artifacts SET current_version=?, updated_at=? WHERE id=?').run(next, now(), a.id);
    inTx?.(next);
    return next;
  });
}

function latestState(a, rev) {
  const s = rev
    ? q('SELECT rev,json,saved_by,saved_at FROM states WHERE artifact_id=? AND rev=?').get(a.id, rev)
    : q('SELECT rev,json,saved_by,saved_at FROM states WHERE artifact_id=? ORDER BY rev DESC LIMIT 1').get(a.id);
  if (rev && !s) throw new HttpError(404, 'not_found', `No state revision ${rev}`);
  return s ? { rev: s.rev, state: JSON.parse(s.json), savedBy: s.saved_by, savedAt: s.saved_at } : { rev: 0, state: null, savedBy: null, savedAt: null };
}
function saveState(a, body, by) {
  if (!('state' in body)) throw bad('body needs "state"');
  const json = JSON.stringify(body.state);
  if (Buffer.byteLength(json) > LIMITS.state) throw new HttpError(413, 'too_large', `state exceeds ${LIMITS.state} bytes`);
  if (body.baseRev != null && !Number.isInteger(body.baseRev)) throw bad('baseRev must be an integer');
  return tx(() => {
    const cur = q('SELECT COALESCE(MAX(rev),0) rev FROM states WHERE artifact_id=?').get(a.id).rev;
    if (body.baseRev != null && body.baseRev !== cur) throw new HttpError(409, 'conflict', 'State changed since baseRev', { currentRev: cur });
    const savedAt = now();
    q('INSERT INTO states(artifact_id,rev,json,saved_by,saved_at) VALUES(?,?,?,?,?)').run(a.id, cur + 1, json, by, savedAt);
    // shortcut: keeps the newest LIMITS.stateRevs revisions per artifact; raise it if Iñaki needs deeper history.
    q('DELETE FROM states WHERE artifact_id=? AND rev<=?').run(a.id, cur + 1 - LIMITS.stateRevs);
    return { rev: cur + 1, savedBy: by, savedAt };
  });
}
const stateHistory = (a, limit = 100) =>
  q('SELECT rev, saved_by savedBy, saved_at savedAt, length(json) bytes FROM states WHERE artifact_id=? ORDER BY rev DESC LIMIT ?').all(a.id, limit);

function summary(a) {
  return {
    id: a.id, slug: a.slug, title: a.title, visibility: a.visibility, version: a.current_version, url: artifactUrl(a),
    createdAt: a.created_at, updatedAt: a.updated_at,
  };
}
function detail(a) {
  const v = versionRow(a);
  return {
    ...summary(a),
    versions: q('SELECT version, note, created_by createdBy, created_at createdAt FROM versions WHERE artifact_id=? ORDER BY version DESC').all(a.id),
    files: v ? q('SELECT path, size, content_type contentType FROM files WHERE version_id=? ORDER BY path').all(v.id) : [],
    credentials: q('SELECT username, created_at createdAt FROM credentials WHERE artifact_id=? ORDER BY username').all(a.id),
    stateRev: q('SELECT COALESCE(MAX(rev),0) rev FROM states WHERE artifact_id=?').get(a.id).rev,
  };
}
const bumpEpoch = (a) => q('UPDATE artifacts SET cap_epoch=cap_epoch+1 WHERE id=?').run(a.id);

// ---------- login rate limiting ----------
// Failed attempts per key in a sliding 15 min window: 10 per IP, 10 per artifact+username.
const fails = new Map();
const WINDOW = 15 * 60e3;
const recent = (key) => (fails.get(key) || []).filter((t) => Date.now() - t < WINDOW);
const isLimited = (keys) => keys.some((k) => recent(k).length >= 10);
const recordFail = (keys) => keys.forEach((k) => fails.set(k, [...recent(k), Date.now()]));
setInterval(() => {
  for (const k of fails.keys()) if (!recent(k).length) fails.delete(k);
  q('DELETE FROM sessions WHERE expires_at<?').run(Date.now());
}, 5 * 60e3).unref();

// ---------- agent API ----------
function agent(req) {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '');
  const t = m && q('SELECT id,name,private_only FROM api_tokens WHERE token_hash=? AND revoked_at IS NULL').get(L.sha256(m[1]));
  if (!t) throw new HttpError(401, 'unauthorized', 'Missing or invalid bearer token', { auth: true });
  q('UPDATE api_tokens SET last_used_at=? WHERE id=?').run(now(), t.id);
  return { id: t.id, by: `agent:${t.name}`, privateOnly: !!t.private_only };
}
const forbidden = (message) => new HttpError(403, 'forbidden', message);
// A private-only token (the CRM) may act only on private artifacts it created itself.
function assertAccess(tok, a) {
  if (tok.privateOnly && (a.created_by_token !== tok.id || a.visibility !== 'private')) throw forbidden('This token can only use private artifacts it created');
}

async function agentApi(req, res, parts, url) {
  const tok = agent(req);
  const { by } = tok;
  const M = req.method;
  const [r0, ref, r2, ...rest] = parts; // artifacts/:ref/<r2>/<rest>
  if (r0 === 'uploads') return uploadsApi(req, res, tok, ref, r2, rest);
  if (r0 === 'tokens') {
    // A private-only token must not mint itself an unrestricted one.
    if (tok.privateOnly) throw forbidden('This token cannot manage tokens');
    if (M === 'GET' && !ref) return send(res, 200, q('SELECT id,name,private_only privateOnly,created_at createdAt,last_used_at lastUsedAt,revoked_at revokedAt FROM api_tokens ORDER BY id').all());
    if (M === 'POST' && !ref) {
      const { name } = await readJson(req, 4096);
      if (typeof name !== 'string' || !/^[\w.-]{1,64}$/.test(name)) throw bad('name must match [A-Za-z0-9_.-]{1,64}');
      const token = L.randomToken(32);
      const id = Number(q('INSERT INTO api_tokens(name,token_hash,created_at) VALUES(?,?,?)').run(name, L.sha256(token), now()).lastInsertRowid);
      return send(res, 201, { id, name, token });
    }
    if (M === 'DELETE' && /^\d+$/.test(ref || '')) {
      const r = q('UPDATE api_tokens SET revoked_at=? WHERE id=? AND revoked_at IS NULL').run(now(), Number(ref));
      return send(res, r.changes ? 200 : 404, { revoked: !!r.changes });
    }
  }
  if (r0 !== 'artifacts') throw new HttpError(404, 'not_found', 'Unknown endpoint');

  if (!ref) {
    if (M === 'GET') {
      const rows = tok.privateOnly
        ? q("SELECT * FROM artifacts WHERE created_by_token=? AND visibility='private' ORDER BY updated_at DESC").all(tok.id)
        : q('SELECT * FROM artifacts ORDER BY updated_at DESC').all();
      return send(res, 200, rows.map(summary));
    }
    if (M === 'POST') {
      const body = await readJson(req, LIMITS.body);
      const title = checkTitle(body.title);
      const slug = body.slug != null ? checkSlug(body.slug) : uniqueSlug(L.slugify(title));
      const visibility = body.visibility != null ? checkVisibility(body.visibility) : tok.privateOnly ? 'private' : 'public';
      if (tok.privateOnly && visibility !== 'private') throw forbidden('This token can only create private artifacts');
      const files = parseFiles(body);
      const t = now();
      const id = Number(q('INSERT INTO artifacts(slug,title,visibility,created_at,updated_at,created_by_token) VALUES(?,?,?,?,?,?)').run(slug, title, visibility, t, t, tok.id).lastInsertRowid);
      const a = q('SELECT * FROM artifacts WHERE id=?').get(id);
      try { writeVersion(a, { files, note: body.note ?? 'initial', by }); } catch (e) { q('DELETE FROM artifacts WHERE id=?').run(id); throw e; }
      return send(res, 201, detail(findArtifact(String(id))));
    }
  }

  const a = findArtifact(ref);
  const sub = r2 ?? '';
  assertAccess(tok, a);
  if (tok.privateOnly && ((sub === '' && M === 'DELETE') || sub === 'credentials')) throw forbidden('This token cannot delete artifacts or manage credentials');
  if (sub === '') {
    if (M === 'GET') return send(res, 200, detail(a));
    if (M === 'PATCH') {
      const body = await readJson(req, 65536);
      const title = body.title != null ? checkTitle(body.title) : a.title;
      const slug = body.slug != null ? checkSlug(body.slug, a.id) : a.slug;
      const visibility = body.visibility != null ? checkVisibility(body.visibility) : a.visibility;
      if (tok.privateOnly && body.visibility === 'public') throw forbidden('This token cannot make an artifact public');
      q('UPDATE artifacts SET title=?,slug=?,visibility=?,updated_at=? WHERE id=?').run(title, slug, visibility, now(), a.id);
      if (visibility === 'private' && a.visibility !== 'private') bumpEpoch(a);
      return send(res, 200, detail(findArtifact(String(a.id))));
    }
    if (M === 'DELETE') {
      q('DELETE FROM artifacts WHERE id=?').run(a.id);
      gcBlobs();
      return send(res, 200, { deleted: true, slug: a.slug });
    }
  }
  if (sub === 'versions' && M === 'POST' && !rest.length) {
    const body = await readJson(req, LIMITS.body);
    const remove = body.removeFiles ?? [];
    if (!Array.isArray(remove) || remove.some((p) => typeof p !== 'string')) throw bad('removeFiles must be an array of paths');
    writeVersion(a, { fromVersionId: versionRow(a)?.id, files: parseFiles(body), remove, note: body.note ?? null, by });
    return send(res, 201, detail(findArtifact(String(a.id))));
  }
  if (sub === 'rollback' && M === 'POST') {
    const { version } = await readJson(req, 4096);
    const v = Number.isInteger(version) && versionRow(a, version);
    if (!v) throw new HttpError(404, 'not_found', 'No such version');
    writeVersion(a, { fromVersionId: v.id, note: `rollback to v${version}`, by });
    return send(res, 201, detail(findArtifact(String(a.id))));
  }
  if (sub === 'files' && rest.length) {
    const p = rest.join('/');
    if (M === 'GET') {
      const v = versionRow(a, url.searchParams.has('version') ? Number(url.searchParams.get('version')) : a.current_version);
      const f = v && q('SELECT * FROM files WHERE version_id=? AND path=?').get(v.id, p);
      if (!f) throw new HttpError(404, 'not_found', 'File not found');
      res.writeHead(200, { 'Content-Type': f.content_type, 'Content-Length': f.size, 'Cache-Control': 'no-store', 'Content-Disposition': 'attachment' });
      return fs.createReadStream(blobPath(f.blob)).pipe(res);
    }
    if (M === 'PUT') {
      const file = fileEntry(p, await readBody(req, LIMITS.file), req.headers['content-type']);
      writeVersion(a, { fromVersionId: versionRow(a)?.id, files: [file], note: `upload ${p}`, by });
      return send(res, 201, detail(findArtifact(String(a.id))));
    }
    if (M === 'DELETE') {
      if (p === 'index.html') throw bad('index.html cannot be removed');
      writeVersion(a, { fromVersionId: versionRow(a)?.id, remove: [p], note: `remove ${p}`, by });
      return send(res, 200, detail(findArtifact(String(a.id))));
    }
  }
  if (sub === 'credentials') {
    const [username] = rest;
    if (M === 'GET' && !username) return send(res, 200, detail(a).credentials);
    if (M === 'POST' && !username) {
      const body = await readJson(req, 4096);
      if (typeof body.username !== 'string' || !/^[A-Za-z0-9._@-]{1,64}$/.test(body.username)) throw bad('username must match [A-Za-z0-9._@-]{1,64}');
      const generated = body.password == null;
      const password = generated ? L.randomToken(12) : body.password;
      if (typeof password !== 'string' || password.length < 10 || password.length > 200) throw bad('password must be 10-200 chars (omit it to generate one)');
      const hash = await L.hashPassword(password);
      const existing = q('SELECT id FROM credentials WHERE artifact_id=? AND username=?').get(a.id, body.username);
      if (existing && !body.replace) throw new HttpError(409, 'exists', 'Credential exists; pass "replace": true to reset its password');
      if (existing) {
        q('UPDATE credentials SET password_hash=? WHERE id=?').run(hash, existing.id);
        q('DELETE FROM sessions WHERE credential_id=?').run(existing.id);
      } else {
        q('INSERT INTO credentials(artifact_id,username,password_hash,created_at) VALUES(?,?,?,?)').run(a.id, body.username, hash, now());
      }
      return send(res, existing ? 200 : 201, { username: body.username, ...(generated ? { password } : {}), url: artifactUrl(a) });
    }
    if (M === 'DELETE' && username) {
      const r = q('DELETE FROM credentials WHERE artifact_id=? AND username=?').run(a.id, username); // sessions cascade
      bumpEpoch(a);
      return send(res, r.changes ? 200 : 404, { deleted: !!r.changes });
    }
  }
  if (sub === 'state') {
    if (rest[0] === 'history' && M === 'GET') return send(res, 200, stateHistory(a, Math.min(Number(url.searchParams.get('limit')) || 100, LIMITS.stateRevs)));
    if (!rest.length && M === 'GET') return send(res, 200, latestState(a, Number(url.searchParams.get('rev')) || 0));
    if (!rest.length && M === 'PUT') return send(res, 200, saveState(a, await readJson(req, LIMITS.state + 4096), by));
  }
  throw new HttpError(404, 'not_found', 'Unknown endpoint');
}

// ---------- upload sessions (resumable, one part in memory at a time) ----------
const UPLOADS = path.join(CFG.dataDir, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });
const uploadDir = (id) => path.join(UPLOADS, String(id));
const partFile = (id, n) => path.join(uploadDir(id), `${n}.part`);
const HEX64 = /^[0-9a-f]{64}$/;
const hex64 = (v) => (typeof v === 'string' && HEX64.test(v.toLowerCase()) ? v.toLowerCase() : null);

function gcUploads() {
  q('DELETE FROM uploads WHERE expires_at<?').run(Date.now());
  for (const { id } of q("SELECT id FROM uploads WHERE state='open'").all()) if (!fs.existsSync(uploadDir(id))) q('DELETE FROM uploads WHERE id=?').run(id);
  const live = new Set(q("SELECT id FROM uploads WHERE state='open'").all().map((r) => String(r.id)));
  for (const d of fs.readdirSync(UPLOADS)) if (!live.has(d)) fs.rmSync(path.join(UPLOADS, d), { recursive: true, force: true });
}
function loadUpload(ref, tok) {
  const u = /^\d+$/.test(ref || '') && q('SELECT * FROM uploads WHERE id=? AND expires_at>?').get(Number(ref), Date.now());
  if (!u || (tok.privateOnly && u.created_by_token !== tok.id)) throw new HttpError(404, 'not_found', 'Upload not found');
  return u;
}
function received(u) {
  const got = new Set(q('SELECT n FROM upload_parts WHERE upload_id=?').all(u.id).map((r) => r.n));
  const missing = [];
  for (let n = 0; n < u.parts && missing.length < 100; n++) if (!got.has(n)) missing.push(n);
  return { receivedCount: got.size, missing };
}
const completedBody = (u) => ({ id: u.id, artifact: u.artifact_id, version: u.version, size: u.size, verified: true });
const notOpen = () => new HttpError(409, 'conflict', 'Upload is already completed');

async function createUpload(req, res, tok) {
  const b = await readJson(req, 4096);
  if (!Number.isInteger(b.artifact)) throw bad('artifact must be an integer id');
  const a = q('SELECT * FROM artifacts WHERE id=?').get(b.artifact);
  if (!a) throw new HttpError(404, 'not_found', 'Artifact not found');
  assertAccess(tok, a);
  if (typeof b.path !== 'string' || b.path.length > 200 || !L.ASSET_PATH_RE.test(b.path)) throw bad(`invalid file path ${JSON.stringify(b.path)}`);
  if (!Number.isInteger(b.size) || b.size < 1) throw bad('size must be a positive integer');
  if (b.size > UPLOAD.maxBytes) throw new HttpError(413, 'too_large', `size exceeds ${UPLOAD.maxBytes} bytes`);
  const sha = hex64(b.sha256);
  if (!sha) throw bad('sha256 must be 64 hex chars');
  const type = b.contentType === 'text/html' ? 'text/html; charset=utf-8' : b.contentType;
  if (!UPLOAD_TYPES.has(type)) throw bad(`contentType must be one of: ${[...UPLOAD_TYPES, 'text/html'].join(', ')}`);
  // serveContent reads HTML into memory to inject the bridge script.
  if (type.startsWith('text/html') && b.size > LIMITS.file) throw new HttpError(413, 'html_too_large', `text/html uploads are limited to ${LIMITS.file} bytes`);
  // Parts, the assembled copy and the blob briefly coexist; keep a margin for everything else on the disk.
  const { bavail, bsize } = fs.statfsSync(CFG.dataDir);
  if (bavail * bsize < 2 * b.size + UPLOAD.freeMargin) throw new HttpError(507, 'insufficient_storage', 'Not enough free disk space for this upload');
  gcUploads();
  const open = q("SELECT COUNT(*) n, COALESCE(SUM(size),0) bytes FROM uploads WHERE state='open'").get();
  if (open.n >= UPLOAD.sessions || open.bytes + b.size > UPLOAD.openBytes)
    throw new HttpError(429, 'upload_limit', `At most ${UPLOAD.sessions} open uploads totalling ${UPLOAD.openBytes} bytes; complete or abort one`);
  const t = Date.now();
  const parts = Math.ceil(b.size / UPLOAD.partBytes);
  const id = Number(q(`INSERT INTO uploads(artifact_id,path,size,sha256,content_type,part_size,parts,created_at,expires_at,created_by_token)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).run(a.id, b.path, b.size, sha, type, UPLOAD.partBytes, parts, t, t + UPLOAD.ttl, tok.id).lastInsertRowid);
  fs.mkdirSync(uploadDir(id), { recursive: true });
  return send(res, 201, { id, artifact: a.id, size: b.size, partSize: UPLOAD.partBytes, parts, expiresAt: t + UPLOAD.ttl });
}

async function putPart(req, res, u, ref) {
  const n = /^\d+$/.test(ref) ? Number(ref) : -1;
  if (n < 0 || n >= u.parts) throw bad(`part must be in [0, ${u.parts})`);
  const digest = hex64(req.headers['x-content-sha256']);
  if (!digest) throw bad('X-Content-Sha256 header must be 64 hex chars');
  if (u.state !== 'open') throw notOpen();
  const len = Math.min(u.part_size, u.size - n * u.part_size);
  const wrongLength = bad(`part ${n} must be exactly ${len} bytes`);
  if (req.headers['content-length'] != null && Number(req.headers['content-length']) !== len) throw wrongLength;
  const buf = await readBody(req, len).catch((e) => { throw e.status === 413 ? wrongLength : e; });
  if (buf.length !== len) throw wrongLength;
  if (L.sha256(buf) !== digest) throw new HttpError(400, 'integrity', 'Part bytes do not match X-Content-Sha256');
  // Synchronous from here on, so no other request can interleave between the checks and the write.
  const cur = q('SELECT state FROM uploads WHERE id=?').get(u.id);
  if (!cur) throw new HttpError(404, 'not_found', 'Upload not found');
  if (cur.state !== 'open') throw notOpen();
  const have = q('SELECT sha256 FROM upload_parts WHERE upload_id=? AND n=?').get(u.id, n);
  if (have && have.sha256 !== digest) throw new HttpError(409, 'conflict', `Part ${n} is already stored with a different digest`);
  if (!have) {
    const tmp = `${partFile(u.id, n)}.tmp`;
    const fd = fs.openSync(tmp, 'w');
    try { fs.writeFileSync(fd, buf); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(tmp, partFile(u.id, n));
    q('INSERT INTO upload_parts(upload_id,n,sha256,size) VALUES(?,?,?,?)').run(u.id, n, digest, len);
  }
  return send(res, 200, { id: u.id, part: n, receivedCount: received(u).receivedCount, parts: u.parts });
}

async function completeUpload(req, res, u, tok) {
  const { note } = await readJson(req, 4096);
  if (note != null && (typeof note !== 'string' || note.length > 500)) throw bad('note must be a string of at most 500 chars');
  if (u.state === 'completed') return send(res, 200, completedBody(u));
  const { receivedCount, missing } = received(u);
  if (receivedCount < u.parts) throw new HttpError(409, 'incomplete', `${u.parts - receivedCount} parts missing`, { missing });
  // Same filesystem as blobs/, so the final rename is atomic.
  const tmp = path.join(uploadDir(u.id), `assembled.${L.randomToken(6)}.tmp`);
  const hash = crypto.createHash('sha256');
  let head = Buffer.alloc(0);
  let size = 0;
  try {
    await pipeline(async function* () {
      for (let n = 0; n < u.parts; n++) {
        for await (const c of fs.createReadStream(partFile(u.id, n))) {
          hash.update(c);
          size += c.length;
          if (head.length < 8) head = Buffer.concat([head, c.subarray(0, 8)]);
          yield c;
        }
      }
    }, fs.createWriteStream(tmp, { flush: true }));
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    const cur = q('SELECT * FROM uploads WHERE id=?').get(u.id);
    if (cur?.state === 'completed') return send(res, 200, completedBody(cur)); // a concurrent complete won and removed the parts
    if (e.code === 'ENOENT') throw new HttpError(409, 'conflict', 'Upload parts are gone (aborted?); open a new upload');
    throw e;
  }
  const cur = q('SELECT * FROM uploads WHERE id=?').get(u.id);
  const fail = (err) => { fs.rmSync(tmp, { force: true }); throw err; };
  if (!cur) fail(new HttpError(404, 'not_found', 'Upload not found'));
  if (cur.state === 'completed') { fs.rmSync(tmp, { force: true }); return send(res, 200, completedBody(cur)); }
  if (size !== u.size || hash.digest('hex') !== u.sha256) {
    // Every part matched its own digest, so which bytes are wrong is unknown: drop all parts and let the client resend.
    q('DELETE FROM upload_parts WHERE upload_id=?').run(u.id);
    fs.rmSync(uploadDir(u.id), { recursive: true, force: true });
    fs.mkdirSync(uploadDir(u.id), { recursive: true });
    throw new HttpError(422, 'integrity', 'Assembled file does not match the declared sha256; resend all parts');
  }
  const magic = MAGIC[u.content_type];
  if (magic && !head.subarray(0, magic.length).equals(magic)) fail(new HttpError(422, 'content_type_mismatch', `File content is not ${u.content_type}`));
  // Visibility or the artifact itself may have changed while the parts were assembled.
  const a = q('SELECT * FROM artifacts WHERE id=?').get(u.artifact_id);
  if (!a) fail(new HttpError(404, 'not_found', 'Artifact not found'));
  try { assertAccess(tok, a); } catch (e) { fail(e); }
  moveIntoBlobs(tmp, u.sha256);
  const version = writeVersion(a, {
    fromVersionId: versionRow(a)?.id, files: [{ path: u.path, sha: u.sha256, size: u.size, type: u.content_type }],
    note: note ?? `upload ${u.path}`, by: tok.by,
    inTx: (v) => q("UPDATE uploads SET state='completed', version=? WHERE id=?").run(v, u.id),
  });
  fs.rmSync(uploadDir(u.id), { recursive: true, force: true });
  return send(res, 200, completedBody({ ...u, version }));
}

async function uploadsApi(req, res, tok, ref, sub, rest) {
  const M = req.method;
  if (!ref && M === 'POST') return createUpload(req, res, tok);
  const u = loadUpload(ref, tok);
  if (!sub && M === 'GET') {
    return send(res, 200, { id: u.id, artifact: u.artifact_id, size: u.size, partSize: u.part_size, parts: u.parts, ...received(u),
      state: u.state, expiresAt: u.expires_at, ...(u.version != null ? { version: u.version } : {}) });
  }
  if (!sub && M === 'DELETE') {
    q('DELETE FROM uploads WHERE id=?').run(u.id);
    fs.rmSync(uploadDir(u.id), { recursive: true, force: true });
    return send(res, 200, { id: u.id, aborted: true });
  }
  if (sub === 'parts' && rest.length === 1 && M === 'PUT') return putPart(req, res, u, rest[0]);
  if (sub === 'complete' && !rest.length && M === 'POST') return completeUpload(req, res, u, tok);
  throw new HttpError(404, 'not_found', 'Unknown endpoint');
}

// ---------- guest API (called only by the shell page on the app origin) ----------
const cookieName = (a) => `__Host-a${a.id}`;
function getSession(req, a) {
  const tok = cookies(req)[cookieName(a)];
  if (!tok) return null;
  return q(`SELECT s.csrf, s.credential_id, c.username FROM sessions s JOIN credentials c ON c.id=s.credential_id
            WHERE s.token_hash=? AND s.artifact_id=? AND s.expires_at>?`).get(L.sha256(tok), a.id, Date.now()) ?? null;
}
const sessionCookie = (a, value, maxAge) => `${cookieName(a)}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;

async function guestApi(req, res, ref, sub, url) {
  // Custom header forces a CORS preflight (which we never answer), so only same-origin JS can call this API.
  if (req.headers['x-artifact-shell'] !== '1') throw new HttpError(403, 'forbidden', 'Missing X-Artifact-Shell header');
  const M = req.method;
  if (M !== 'GET' && req.headers.origin !== CFG.appOrigin) throw new HttpError(403, 'forbidden', 'Bad origin');
  const a = findArtifact(ref);
  const s = getSession(req, a);
  const needSession = () => { if (!s) throw new HttpError(401, 'unauthorized', 'Login required'); };
  const needCsrf = () => { needSession(); if (!L.safeEqual(req.headers['x-artifact-csrf'] || '', s.csrf)) throw new HttpError(403, 'csrf', 'Bad CSRF token'); };

  if (sub === 'login' && M === 'POST') {
    const ip = clientIp(req);
    const body = await readJson(req, 4096);
    const { username, password } = body;
    if (typeof username !== 'string' || typeof password !== 'string' || username.length > 64 || password.length > 200) throw bad('username and password required');
    const keys = [`ip:${ip}`, `u:${a.id}:${username.toLowerCase()}`];
    if (isLimited(keys)) throw new HttpError(429, 'rate_limited', 'Too many attempts, try again later', { retryAfter: WINDOW / 1000 });
    const cred = q('SELECT id,password_hash FROM credentials WHERE artifact_id=? AND username=?').get(a.id, username);
    const ok = (await L.verifyPassword(password, cred?.password_hash ?? L.DUMMY_HASH)) && !!cred;
    if (!ok) { recordFail(keys); throw new HttpError(401, 'invalid_credentials', 'Invalid username or password'); }
    const token = L.randomToken(32);
    const csrf = L.randomToken(24);
    q('INSERT INTO sessions(token_hash,artifact_id,credential_id,csrf,expires_at) VALUES(?,?,?,?,?)').run(L.sha256(token), a.id, cred.id, csrf, Date.now() + SESSION_MS);
    return send(res, 200, { user: username, csrf, canEdit: true }, { 'Set-Cookie': sessionCookie(a, token, SESSION_MS / 1000) });
  }
  if (sub === 'logout' && M === 'POST') {
    const tok = cookies(req)[cookieName(a)];
    if (tok) q('DELETE FROM sessions WHERE token_hash=?').run(L.sha256(tok));
    return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(a, '', 0) });
  }
  if (sub === 'session' && M === 'GET') return send(res, 200, { user: s?.username ?? null, canEdit: !!s });
  if (sub === 'state' && M === 'GET') {
    const rev = Number(url.searchParams.get('rev')) || 0;
    if (a.visibility === 'private' || rev) needSession();
    return send(res, 200, latestState(a, rev));
  }
  if (sub === 'state' && M === 'PUT') {
    needCsrf();
    return send(res, 200, saveState(a, await readJson(req, LIMITS.state + 4096), s.username));
  }
  if (sub === 'state/history' && M === 'GET') { needSession(); return send(res, 200, stateHistory(a)); }
  throw new HttpError(404, 'not_found', 'Unknown endpoint');
}

// ---------- pages ----------
const jsonForScript = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
function shellPage(res, a, s) {
  const needsLogin = a.visibility === 'private' && !s;
  const hasCreds = !!q('SELECT 1 FROM credentials WHERE artifact_id=? LIMIT 1').get(a.id);
  const title = needsLogin ? 'Contenido privado' : a.title;
  const capUrl = needsLogin ? null : `${CFG.contentOrigin}/c/${L.signContent(secret, a.id, a.current_version, a.cap_epoch, CONTENT_TTL)}/`;
  const boot = { id: a.id, slug: a.slug, title: needsLogin ? null : a.title, version: a.current_version, visibility: a.visibility, hasCreds,
    session: s ? { user: s.username, csrf: s.csrf } : null };
  const nonce = L.randomToken(16);
  const html = `<!doctype html><html lang="es"${needsLogin ? ' class="priv"' : ''}><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="${ROBOTS}"><meta name="referrer" content="no-referrer">
<title>${L.escapeHtml(title)}</title><style nonce="${nonce}">${SHELL_CSS}</style></head><body>
${capUrl ? `<iframe id="f" src="${L.escapeHtml(capUrl)}" title="${L.escapeHtml(a.title)}" sandbox="${SANDBOX}" allow="clipboard-write; fullscreen" referrerpolicy="no-referrer"></iframe>` : ''}
${hasCreds && capUrl ? '<button id="pill" type="button" hidden></button>' : ''}
<dialog id="login" aria-labelledby="lt"><form id="lf"><h1 id="lt">${needsLogin ? 'Este contenido es privado' : 'Ingresar para editar'}</h1>
<label>Usuario<input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
<label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label>
<p id="err" role="alert"></p><div class="row"><button type="button" id="cancel">Cancelar</button><button type="submit" id="go">Ingresar</button></div></form></dialog>
<script type="application/json" id="boot">${jsonForScript(boot)}</script><script nonce="${nonce}">${SHELL_JS}</script></body></html>`;
  send(res, 200, html, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; img-src 'self' data:; connect-src 'self'; frame-src ${CFG.contentOrigin}; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
  });
}
const notFoundPage = (res) => send(res, 404, `<!doctype html><meta name="robots" content="${ROBOTS}"><title>404</title><p>Not found.</p>`, { 'Content-Type': 'text/html; charset=utf-8' });

// ---------- content origin ----------
function serveContent(req, res, url) {
  const m = /^\/c\/([^/]+)(\/.*)?$/.exec(url.pathname);
  if (!m) return notFoundPage(res);
  if (!m[2]) return send(res, 301, '', { Location: `/c/${m[1]}/` });
  const cap = L.verifyContent(secret, m[1]);
  const a = cap && q('SELECT * FROM artifacts WHERE id=?').get(cap.artifactId);
  if (!a || a.cap_epoch !== cap.epoch) return send(res, 403, 'Link expired, reload the page.');
  let p;
  try { p = decodeURIComponent(m[2].slice(1)); } catch { return notFoundPage(res); }
  if (p === '' || p.endsWith('/')) p += 'index.html';
  if (!L.ASSET_PATH_RE.test(p)) return notFoundPage(res);
  const f = q('SELECT f.* FROM files f JOIN versions v ON v.id=f.version_id WHERE v.artifact_id=? AND v.version=? AND f.path=?').get(a.id, cap.version, p);
  if (!f) return notFoundPage(res);
  const headers = {
    'Content-Type': f.content_type,
    'Content-Security-Policy': `sandbox ${SANDBOX}; frame-ancestors ${CFG.appOrigin}`,
    'Referrer-Policy': 'no-referrer',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'private, max-age=300',
  };
  if (f.content_type.startsWith('text/html')) {
    return send(res, 200, L.injectIntoHtml(fs.readFileSync(blobPath(f.blob), 'utf8'), CLIENT_JS), headers);
  }
  res.writeHead(200, { ...headers, 'Content-Length': f.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(blobPath(f.blob)).pipe(res);
}

// ---------- router ----------
async function handle(req, res) {
  res.setHeader('X-Robots-Tag', ROBOTS);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const host = (req.headers.host || '').toLowerCase();
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/robots.txt') return send(res, 200, 'User-agent: *\nDisallow: /\n', { 'Cache-Control': 'public, max-age=3600' });
  if (url.pathname === '/health') return send(res, 200, { ok: true });
  if (host === CONTENT_HOST && host !== APP_HOST) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    return serveContent(req, res, url);
  }
  if (host !== APP_HOST) return send(res, 421, 'Misdirected request');

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'api' && parts[1] === 'v1') return agentApi(req, res, parts.slice(2).map(decodeURIComponent), url);
  if (parts[0] === 'api' && parts[1] === 'a' && parts[2]) return guestApi(req, res, decodeURIComponent(parts[2]), parts.slice(3).join('/'), url);
  if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'method_not_allowed', 'Method not allowed');
  if (parts.length === 0) return send(res, 200, `<!doctype html><meta name="robots" content="${ROBOTS}"><title>Artifacts</title><p>Nothing to see here.</p>`, { 'Content-Type': 'text/html; charset=utf-8' });
  if (parts.length !== 1 || !L.SLUG_RE.test(parts[0])) return notFoundPage(res);
  const a = q('SELECT * FROM artifacts WHERE slug=?').get(parts[0]);
  if (!a) return notFoundPage(res);
  return shellPage(res, a, getSession(req, a));
}

// ---------- CLI ----------
const [cmd, sub, arg] = process.argv.slice(2);
if (cmd === 'token' && sub === 'create') {
  if (!/^[\w.-]{1,64}$/.test(arg || '')) { console.error('usage: token create <name> [--private-only]'); process.exit(2); }
  const token = L.randomToken(32);
  q('INSERT INTO api_tokens(name,token_hash,created_at,private_only) VALUES(?,?,?,?)').run(arg, L.sha256(token), now(), process.argv.includes('--private-only') ? 1 : 0);
  process.stdout.write(token); // printed once, meant to be piped straight into a secret store
} else if (cmd === 'token' && sub === 'list') {
  console.table(q('SELECT id,name,private_only,created_at,last_used_at,revoked_at FROM api_tokens').all());
} else if (cmd === 'token' && sub === 'revoke') {
  console.log(q('UPDATE api_tokens SET revoked_at=? WHERE id=? AND revoked_at IS NULL').run(now(), Number(arg)).changes ? 'revoked' : 'not found');
} else if (cmd === 'backup') {
  // Consistent DB snapshot; blobs are immutable/content-addressed so the caller copies them as-is.
  const out = path.resolve(sub || path.join(CFG.dataDir, 'backups', `artifacts-${now().replace(/[:.]/g, '-')}.db`));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  db.prepare('VACUUM INTO ?').run(out);
  console.log(out);
} else if (cmd) {
  console.error('usage: server.mjs [token create <name> [--private-only] | token list | token revoke <id> | backup [file]]');
  process.exit(2);
} else {
  gcUploads();
  setInterval(gcUploads, 3600e3).unref();
  http.createServer((req, res) => {
    handle(req, res).catch((e) => {
      if (!(e instanceof HttpError)) console.error(new Date().toISOString(), req.method, req.url.split('?')[0], e);
      if (res.headersSent) return res.destroy();
      const err = e instanceof HttpError ? e : new HttpError(500, 'internal', 'Internal error');
      const extra = err.extra || {};
      const headers = extra.retryAfter ? { 'Retry-After': String(extra.retryAfter) } : extra.auth ? { 'WWW-Authenticate': 'Bearer' } : {};
      send(res, err.status, { error: { code: err.code, message: err.message, ...(extra.currentRev != null ? { currentRev: extra.currentRev } : {}),
        ...(extra.missing ? { missing: extra.missing } : {}) } }, headers);
    });
  }).listen(CFG.port, () => console.log(`artifacts on :${CFG.port} app=${CFG.appOrigin} content=${CFG.contentOrigin}`));
}
