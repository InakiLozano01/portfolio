// End-to-end check against throwaway servers: `node --test artifacts/selftest.mjs`
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const server = path.join(import.meta.dirname, 'server.mjs');
async function start(extraEnv = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-test-'));
  const port = 40000 + Math.floor(Math.random() * 20000);
  const APP = `http://localhost:${port}`;
  const env = { ...process.env, DATA_DIR: dir, PORT: String(port), APP_ORIGIN: APP, CONTENT_ORIGIN: `http://127.0.0.1:${port}`, ...extraEnv };
  const mint = (...args) => execFileSync(process.execPath, [server, 'token', 'create', ...args], { env }).toString();
  const token = mint('selftest');
  const privateToken = mint('crm', '--private-only');
  const proc = spawn(process.execPath, [server], { env, stdio: 'inherit' });
  after(() => { proc.kill(); fs.rmSync(dir, { recursive: true, force: true }); });
  for (let i = 0; i < 50; i++) { try { await fetch(`${APP}/health`); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  return { dir, APP, token, privateToken };
}
// Both servers start before any test is registered, so --test-name-pattern runs work.
const main = await start();
const PART = 1000;
const small = await start({ ARTIFACTS_UPLOAD_PART_BYTES: String(PART), ARTIFACTS_MAX_UPLOAD_BYTES: '100000' });
const { APP, token } = main;

const api = (method, p, body, headers = {}) =>
  fetch(APP + p, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers }, body: body && JSON.stringify(body) });
const shell = (method, p, body, headers = {}) =>
  fetch(APP + p, { method, headers: { 'X-Artifact-Shell': '1', Origin: APP, 'Content-Type': 'application/json', ...headers }, body: body && JSON.stringify(body) });
const capFrom = (html) => /src="(http:\/\/127\.0\.0\.1:\d+\/c\/[^"]+)"/.exec(html)?.[1];

test('agent publishes, guest edits, isolation holds', async () => {
  assert.equal((await fetch(`${APP}/api/v1/artifacts`)).status, 401);
  assert.equal((await api('GET', '/api/v1/artifacts', undefined, { Authorization: 'Bearer nope' })).status, 401);

  let r = await api('POST', '/api/v1/artifacts', { title: 'CRM Etapas Andrés', html: '<!doctype html><html><head><title>x</title></head><body><img src="a/b.svg"></body></html>',
    files: [{ path: 'a/b.svg', content: '<svg xmlns="http://www.w3.org/2000/svg"/>' }] });
  assert.equal(r.status, 201);
  const a = await r.json();
  assert.equal(a.slug, 'crm-etapas-andres');
  r = await api('POST', '/api/v1/artifacts', { title: 'CRM Etapas Andrés', html: '<p>other</p>' });
  const b = await r.json();
  assert.equal(b.slug, 'crm-etapas-andres-2');
  assert.equal((await api('POST', '/api/v1/artifacts', { title: 'x', slug: 'crm-etapas-andres', html: '' })).status, 409);
  assert.equal((await api('POST', '/api/v1/artifacts', { title: 'x', files: [{ path: '../etc/passwd', content: 'x' }] })).status, 400);

  // Viewing by slug: shell + noindex everywhere.
  r = await fetch(`${APP}/${a.slug}`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  const html = await r.text();
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive">/);
  const cap = capFrom(html);
  assert.ok(cap);
  assert.equal(await (await fetch(`${APP}/robots.txt`)).text(), 'User-agent: *\nDisallow: /\n');
  assert.equal((await fetch(`${APP}/sitemap.xml`)).status, 404);

  // Content origin: sandboxed, injected bridge, assets resolve, foreign/forged caps rejected.
  r = await fetch(cap);
  assert.match(r.headers.get('content-security-policy'), /^sandbox allow-scripts/);
  assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  const content = await r.text();
  assert.match(content, /<head><meta name="robots"[^>]*><script>/);
  assert.match(content, /window\.artifact=/);
  assert.equal((await fetch(cap + 'a/b.svg')).status, 200);
  assert.equal((await fetch(cap.replace(/\.[\w-]+\/$/, '.AAAA/'))).status, 403);
  assert.equal((await fetch(`${APP}/c/x/`)).status, 404); // content is not served on the app origin

  // New version keeps slug and assets.
  r = await api('POST', `/api/v1/artifacts/${a.slug}/versions`, { html: '<html><head></head><body>v2</body></html>', note: 'v2' });
  assert.equal((await r.json()).version, 2);
  assert.match(await (await fetch(capFrom(await (await fetch(`${APP}/${a.slug}`)).text()))).text(), /v2/);
  r = await api('PUT', `/api/v1/artifacts/${a.id}/files/data.json`, undefined, { 'Content-Type': 'application/json' });
  assert.equal(r.status, 201); // empty body is a valid (empty) asset

  // Guest credentials.
  r = await api('POST', `/api/v1/artifacts/${a.slug}/credentials`, { username: 'andres' });
  const { password } = await r.json();
  assert.ok(password.length >= 16);
  assert.equal((await shell('PUT', `/api/a/${a.id}/state`, { state: { x: 1 } })).status, 401);
  assert.equal((await shell('POST', `/api/a/${a.id}/login`, { username: 'andres', password: 'wrong-password' })).status, 401);
  assert.equal((await fetch(`${APP}/api/a/${a.id}/login`, { method: 'POST', body: JSON.stringify({ username: 'andres', password }) })).status, 403);
  r = await shell('POST', `/api/a/${a.id}/login`, { username: 'andres', password });
  assert.equal(r.status, 200);
  const setCookie = r.headers.get('set-cookie');
  assert.match(setCookie, /^__Host-a\d+=[\w-]+; Path=\/; Secure; HttpOnly; SameSite=Strict/);
  const cookie = setCookie.split(';')[0];
  const { csrf } = await r.json();

  // CSRF + origin enforced on writes.
  assert.equal((await shell('PUT', `/api/a/${a.id}/state`, { state: { x: 1 } }, { Cookie: cookie })).status, 403);
  assert.equal((await shell('PUT', `/api/a/${a.id}/state`, { state: { x: 1 } }, { Cookie: cookie, 'X-Artifact-CSRF': csrf, Origin: 'https://evil.example' })).status, 403);
  r = await shell('PUT', `/api/a/${a.id}/state`, { state: { stages: ['Lead'] }, baseRev: 0 }, { Cookie: cookie, 'X-Artifact-CSRF': csrf });
  assert.deepEqual(await r.json().then((j) => [j.rev, j.savedBy]), [1, 'andres']);
  assert.equal((await shell('PUT', `/api/a/${a.id}/state`, { state: {}, baseRev: 0 }, { Cookie: cookie, 'X-Artifact-CSRF': csrf })).status, 409);
  r = await shell('GET', `/api/a/${a.id}/state`);
  assert.deepEqual((await r.json()).state, { stages: ['Lead'] });
  r = await api('GET', `/api/v1/artifacts/${a.id}/state/history`);
  assert.equal((await r.json())[0].savedBy, 'andres');

  // The session for artifact A is useless against artifact B.
  assert.equal((await shell('PUT', `/api/a/${b.id}/state`, { state: { stolen: 1 } }, { Cookie: cookie, 'X-Artifact-CSRF': csrf })).status, 401);
  assert.deepEqual((await (await shell('GET', `/api/a/${b.id}/state`)).json()).state, null);

  // Private: anonymous gets the login wall, no content capability; old caps die.
  r = await api('PATCH', `/api/v1/artifacts/${a.id}`, { visibility: 'private', slug: 'crm-andres' });
  assert.equal((await r.json()).url, `${APP}/crm-andres`);
  const anon = await (await fetch(`${APP}/crm-andres`)).text();
  assert.equal(capFrom(anon), undefined);
  assert.doesNotMatch(anon, /CRM Etapas/);
  assert.equal((await fetch(cap)).status, 403);
  assert.equal((await shell('GET', `/api/a/${a.id}/state`)).status, 401);
  const authed = await (await fetch(`${APP}/crm-andres`, { headers: { Cookie: cookie } })).text();
  assert.ok(capFrom(authed));
  assert.equal((await shell('GET', `/api/a/${a.id}/state`, undefined, { Cookie: cookie })).status, 200);

  // Revoking the credential kills its session.
  await api('DELETE', `/api/v1/artifacts/${a.id}/credentials/andres`);
  assert.equal((await shell('GET', `/api/a/${a.id}/state`, undefined, { Cookie: cookie })).status, 401);

  // Rate limit: 10 failures then 429.
  await api('POST', `/api/v1/artifacts/${b.id}/credentials`, { username: 'x', password: 'long-enough-pw' });
  for (let i = 0; i < 10; i++) await shell('POST', `/api/a/${b.id}/login`, { username: 'x', password: 'bad-password' });
  assert.equal((await shell('POST', `/api/a/${b.id}/login`, { username: 'x', password: 'long-enough-pw' })).status, 429);

  // Delete removes it and its blobs.
  assert.equal((await api('DELETE', `/api/v1/artifacts/${a.id}`)).status, 200);
  assert.equal((await fetch(`${APP}/crm-andres`)).status, 404);
});

// ---------- private-only tokens and upload sessions ----------
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const as = (srv, tok) => (method, p, body, headers = {}) =>
  fetch(srv.APP + p, { method, headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', ...headers }, body: body && JSON.stringify(body) });
const putPart = (srv, tok, id, n, buf, digest = sha(buf)) =>
  fetch(`${srv.APP}/api/v1/uploads/${id}/parts/${n}`, { method: 'PUT', body: buf,
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/octet-stream', 'X-Content-Sha256': digest } });
const errCode = async (r) => (await r.json()).error.code;
const crm = as(small, small.privateToken);
const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), crypto.randomBytes(2491)]); // 2500 bytes: parts of 1000, 1000, 500
const slice = (buf, n) => buf.subarray(n * PART, (n + 1) * PART);

test('private-only token: defaults to private, cannot go public, unrestricted token unchanged', async () => {
  let r = await crm('POST', '/api/v1/artifacts', { title: 'CRM doc', html: '<p>doc</p>' });
  assert.equal(r.status, 201);
  const a = await r.json();
  assert.equal(a.visibility, 'private');
  r = await crm('POST', '/api/v1/artifacts', { title: 'Leak', html: '<p>x</p>', visibility: 'public' });
  assert.deepEqual([r.status, await errCode(r)], [403, 'forbidden']);
  r = await crm('PATCH', `/api/v1/artifacts/${a.id}`, { visibility: 'public' });
  assert.deepEqual([r.status, await errCode(r)], [403, 'forbidden']);
  assert.equal((await (await crm('PATCH', `/api/v1/artifacts/${a.id}`, { title: 'CRM doc 2' })).json()).visibility, 'private');
  assert.equal((await crm('GET', '/api/v1/tokens')).status, 403);
  assert.equal((await crm('POST', '/api/v1/tokens', { name: 'escalate' })).status, 403);

  const full = as(small, small.token);
  const pub = await (await full('POST', '/api/v1/artifacts', { title: 'Open', html: '<p>x</p>' })).json();
  assert.equal(pub.visibility, 'public');
  assert.equal((await full('PATCH', `/api/v1/artifacts/${a.id}`, { visibility: 'public' })).status, 200);
  await full('PATCH', `/api/v1/artifacts/${a.id}`, { visibility: 'private' });
  const tokens = await (await full('GET', '/api/v1/tokens')).json();
  assert.deepEqual(tokens.map((t) => [t.name, t.privateOnly]), [['selftest', 0], ['crm', 1]]);
  // Private-only tokens cannot push bytes into a public artifact through uploads either.
  r = await crm('POST', '/api/v1/uploads', { artifact: pub.id, path: 'x.pdf', size: 10, sha256: sha('x'), contentType: 'application/pdf' });
  assert.equal(r.status, 403);
});

test('multi-part upload: out of order, idempotent, conflicts, validation, completion, private download', async () => {
  const a = await (await crm('POST', '/api/v1/artifacts', { title: 'Etapas CRM', html: '<p>index</p>' })).json();
  const create = (body) => crm('POST', '/api/v1/uploads', { artifact: a.id, path: 'docs/etapas.pdf', size: pdf.length, sha256: sha(pdf), contentType: 'application/pdf', ...body });

  assert.equal((await create({ contentType: 'text/javascript' })).status, 400);
  assert.equal((await create({ path: '../x.pdf' })).status, 400);
  assert.equal((await create({ artifact: String(a.id) })).status, 400);
  assert.equal((await create({ artifact: 999999 })).status, 404);
  assert.equal((await create({ sha256: 'abc' })).status, 400);
  assert.equal((await create({ size: 0 })).status, 400);
  assert.equal((await create({ size: 100001 })).status, 413);

  let r = await create();
  assert.equal(r.status, 201);
  const u = await r.json();
  assert.deepEqual([u.artifact, u.size, u.partSize, u.parts], [a.id, 2500, PART, 3]);
  assert.ok(u.expiresAt > Date.now() + 23 * 3600e3);

  assert.deepEqual(await (await putPart(small, small.privateToken, u.id, 2, pdf.subarray(2000))).json(), { id: u.id, part: 2, receivedCount: 1, parts: 3 });
  assert.equal((await putPart(small, small.privateToken, u.id, 0, slice(pdf, 0))).status, 200);
  assert.equal((await putPart(small, small.privateToken, u.id, 0, slice(pdf, 0))).status, 200); // idempotent re-PUT
  const other = crypto.randomBytes(PART);
  r = await putPart(small, small.privateToken, u.id, 0, other);
  assert.deepEqual([r.status, await errCode(r)], [409, 'conflict']);
  assert.equal((await putPart(small, small.privateToken, u.id, 1, slice(pdf, 1).subarray(1))).status, 400); // short
  assert.equal((await putPart(small, small.privateToken, u.id, 2, pdf.subarray(1999))).status, 400); // last part too long
  r = await putPart(small, small.privateToken, u.id, 1, slice(pdf, 1), sha(other));
  assert.deepEqual([r.status, await errCode(r)], [400, 'integrity']);
  assert.equal((await putPart(small, small.privateToken, u.id, 1, slice(pdf, 1), 'nope')).status, 400);
  assert.equal((await putPart(small, small.privateToken, u.id, 3, slice(pdf, 1))).status, 400);
  assert.equal((await putPart(small, small.privateToken, 999999, 0, slice(pdf, 0))).status, 404);

  r = await crm('POST', `/api/v1/uploads/${u.id}/complete`, {});
  assert.deepEqual([r.status, (await r.json()).error], [409, { code: 'incomplete', message: '1 parts missing', missing: [1] }]);
  r = await crm('GET', `/api/v1/uploads/${u.id}`);
  assert.deepEqual(await r.json(), { id: u.id, artifact: a.id, size: 2500, partSize: PART, parts: 3, receivedCount: 2, missing: [1], state: 'open', expiresAt: u.expiresAt });

  assert.equal((await putPart(small, small.privateToken, u.id, 1, slice(pdf, 1))).status, 200);
  r = await crm('POST', `/api/v1/uploads/${u.id}/complete`, { note: 'etapas' });
  assert.equal(r.status, 200);
  const done = await r.json();
  assert.deepEqual(done, { id: u.id, artifact: a.id, version: 2, size: 2500, verified: true });
  assert.deepEqual(await (await crm('POST', `/api/v1/uploads/${u.id}/complete`, {})).json(), done);
  assert.equal((await putPart(small, small.privateToken, u.id, 1, slice(pdf, 1))).status, 409);
  const status = await (await crm('GET', `/api/v1/uploads/${u.id}`)).json();
  assert.deepEqual([status.state, status.version, status.missing], ['completed', 2, []]);
  assert.deepEqual(fs.readdirSync(path.join(small.dir, 'uploads')), []); // part files removed

  r = await crm('GET', `/api/v1/artifacts/${a.id}/files/docs/etapas.pdf`);
  assert.equal(r.headers.get('content-type'), 'application/pdf');
  assert.ok(Buffer.from(await r.arrayBuffer()).equals(pdf));
  const detail = await (await crm('GET', `/api/v1/artifacts/${a.id}`)).json();
  assert.deepEqual(detail.files.map((f) => f.path), ['docs/etapas.pdf', 'index.html']);
  assert.equal(detail.versions[0].note, 'etapas');
  const anon = await (await fetch(`${small.APP}/${a.slug}`)).text();
  assert.match(anon, /Este contenido es privado/);
  assert.doesNotMatch(anon, /\/c\/|Etapas CRM/);
});

test('upload integrity: full-file mismatch recovers by resending, magic bytes, abort', async () => {
  const a = await (await crm('POST', '/api/v1/artifacts', { title: 'Integrity', html: '<p>i</p>' })).json();
  let u = await (await crm('POST', '/api/v1/uploads', { artifact: a.id, path: 'f.pdf', size: pdf.length, sha256: sha(pdf), contentType: 'application/pdf' })).json();
  const corrupt = Buffer.from(slice(pdf, 1));
  corrupt[10] ^= 1; // each part matches its own header digest, the whole file does not
  for (const [n, buf] of [[0, slice(pdf, 0)], [1, corrupt], [2, pdf.subarray(2000)]]) assert.equal((await putPart(small, small.privateToken, u.id, n, buf)).status, 200);
  let r = await crm('POST', `/api/v1/uploads/${u.id}/complete`, {});
  assert.deepEqual([r.status, await errCode(r)], [422, 'integrity']);
  assert.deepEqual((await (await crm('GET', `/api/v1/uploads/${u.id}`)).json()).missing, [0, 1, 2]);
  for (let n = 0; n < 3; n++) assert.equal((await putPart(small, small.privateToken, u.id, n, pdf.subarray(n * PART, (n + 1) * PART))).status, 200);
  assert.equal((await crm('POST', `/api/v1/uploads/${u.id}/complete`, {})).status, 200);

  const notPdf = Buffer.from('<html>not a pdf</html>');
  u = await (await crm('POST', '/api/v1/uploads', { artifact: a.id, path: 'g.pdf', size: notPdf.length, sha256: sha(notPdf), contentType: 'application/pdf' })).json();
  await putPart(small, small.privateToken, u.id, 0, notPdf);
  r = await crm('POST', `/api/v1/uploads/${u.id}/complete`, {});
  assert.deepEqual([r.status, await errCode(r)], [422, 'content_type_mismatch']);

  const html = Buffer.from('<!doctype html><p>hola</p>');
  const h = await (await crm('POST', '/api/v1/uploads', { artifact: a.id, path: 'h.html', size: html.length, sha256: sha(html), contentType: 'text/html' })).json();
  await putPart(small, small.privateToken, h.id, 0, html);
  assert.equal((await crm('POST', `/api/v1/uploads/${h.id}/complete`, {})).status, 200);
  r = await crm('GET', `/api/v1/artifacts/${a.id}/files/h.html`);
  assert.equal(r.headers.get('content-type'), 'text/html; charset=utf-8');

  assert.deepEqual(await (await crm('DELETE', `/api/v1/uploads/${u.id}`)).json(), { id: u.id, aborted: true });
  assert.equal((await crm('GET', `/api/v1/uploads/${u.id}`)).status, 404);
  assert.equal(fs.existsSync(path.join(small.dir, 'uploads', String(u.id))), false);
});

test('expired upload sessions and their parts are garbage collected', async () => {
  const a = await (await crm('POST', '/api/v1/artifacts', { title: 'GC', html: '<p>g</p>' })).json();
  const body = { artifact: a.id, path: 'f.pdf', size: pdf.length, sha256: sha(pdf), contentType: 'application/pdf' };
  const u = await (await crm('POST', '/api/v1/uploads', body)).json();
  await putPart(small, small.privateToken, u.id, 0, slice(pdf, 0));
  const partDir = path.join(small.dir, 'uploads', String(u.id));
  assert.ok(fs.existsSync(path.join(partDir, '0.part')));
  const db = new DatabaseSync(path.join(small.dir, 'artifacts.db'));
  db.prepare('UPDATE uploads SET expires_at=? WHERE id=?').run(Date.now() - 1, u.id);
  db.close();
  assert.equal((await crm('GET', `/api/v1/uploads/${u.id}`)).status, 404);
  const next = await (await crm('POST', '/api/v1/uploads', body)).json(); // creating a session runs the GC
  assert.notEqual(next.id, u.id);
  assert.equal(fs.existsSync(partDir), false);
  await crm('DELETE', `/api/v1/uploads/${next.id}`);
});

test('upload session caps: 8 open sessions, 4 GiB of declared size', async () => {
  const up = as(main, main.privateToken);
  const a = await (await up('POST', '/api/v1/artifacts', { title: 'Caps', html: '<p>c</p>' })).json();
  const create = (size) => up('POST', '/api/v1/uploads', { artifact: a.id, path: 'f.bin', size, sha256: sha('x'), contentType: 'application/octet-stream' });
  const ids = [];
  for (let i = 0; i < 4; i++) ids.push((await (await create(2 ** 30)).json()).id);
  let r = await create(1);
  assert.deepEqual([r.status, await errCode(r)], [429, 'upload_limit']);
  assert.equal((await create(2 ** 30 + 1)).status, 413);
  for (const id of ids.splice(0)) await up('DELETE', `/api/v1/uploads/${id}`);
  for (let i = 0; i < 8; i++) ids.push((await (await create(1)).json()).id);
  assert.equal((await create(1)).status, 429);
  for (const id of ids) await up('DELETE', `/api/v1/uploads/${id}`);
  assert.equal((await create(1)).status, 201);
});

test('a >8 MiB file uploads in 8 MiB parts and downloads byte-identical; 15 MB PUT limit holds', async () => {
  const up = as(main, main.privateToken);
  const a = await (await up('POST', '/api/v1/artifacts', { title: 'Big', html: '<p>b</p>' })).json();
  const big = crypto.randomBytes((8 << 20) + 12345);
  const u = await (await up('POST', '/api/v1/uploads', { artifact: a.id, path: 'big.bin', size: big.length, sha256: sha(big), contentType: 'application/octet-stream' })).json();
  assert.deepEqual([u.partSize, u.parts], [8 << 20, 2]);
  assert.equal((await putPart(main, main.privateToken, u.id, 1, big.subarray(8 << 20))).status, 200);
  assert.equal((await putPart(main, main.privateToken, u.id, 0, big.subarray(0, 8 << 20))).status, 200);
  assert.equal((await up('POST', `/api/v1/uploads/${u.id}/complete`, {})).status, 200);
  const r = await up('GET', `/api/v1/artifacts/${a.id}/files/big.bin`);
  assert.equal(r.headers.get('content-type'), 'application/octet-stream');
  assert.equal(sha(Buffer.from(await r.arrayBuffer())), sha(big));

  const put = (n) => fetch(`${APP}/api/v1/artifacts/${a.id}/files/raw.bin`, { method: 'PUT', body: Buffer.alloc(n),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' } });
  assert.equal((await put((15 << 20) + 1)).status, 413);
  assert.equal((await put(15 << 20)).status, 201);
});
