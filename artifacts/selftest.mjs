// End-to-end check against a throwaway server: `node --test artifacts/selftest.mjs`
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-test-'));
const port = 40000 + Math.floor(Math.random() * 20000);
const APP = `http://localhost:${port}`;
const CONTENT = `http://127.0.0.1:${port}`;
const env = { ...process.env, DATA_DIR: dir, PORT: String(port), APP_ORIGIN: APP, CONTENT_ORIGIN: CONTENT };
const server = path.join(import.meta.dirname, 'server.mjs');
const token = execFileSync(process.execPath, [server, 'token', 'create', 'selftest'], { env }).toString();
const proc = spawn(process.execPath, [server], { env, stdio: 'inherit' });
after(() => { proc.kill(); fs.rmSync(dir, { recursive: true, force: true }); });
for (let i = 0; i < 50; i++) { try { await fetch(`${APP}/health`); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }

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
