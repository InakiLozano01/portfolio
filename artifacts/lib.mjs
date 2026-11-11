// Pure helpers: crypto, slugs, HTML injection. No I/O beyond node:crypto.
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const argon2 = promisify(crypto.argon2);
// OWASP minimum for argon2id: 19 MiB, 2 passes, 1 lane.
const ARGON = { memory: 19456, passes: 2, parallelism: 1, tagLength: 32 };

export const b64u = (buf) => Buffer.from(buf).toString('base64url');
export const randomToken = (bytes = 32) => b64u(crypto.randomBytes(bytes));
export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export async function hashPassword(password) {
  const nonce = crypto.randomBytes(16);
  const tag = await argon2('argon2id', { message: password, nonce, ...ARGON });
  return `$argon2id$v=19$m=${ARGON.memory},t=${ARGON.passes},p=${ARGON.parallelism}$${b64u(nonce)}$${b64u(tag)}`;
}

export async function verifyPassword(password, stored) {
  const m = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([\w-]+)\$([\w-]+)$/.exec(stored || '');
  if (!m) return false;
  const expected = Buffer.from(m[5], 'base64url');
  const tag = await argon2('argon2id', {
    message: password,
    nonce: Buffer.from(m[4], 'base64url'),
    memory: Number(m[1]),
    passes: Number(m[2]),
    parallelism: Number(m[3]),
    tagLength: expected.length,
  });
  return crypto.timingSafeEqual(tag, expected);
}

// A fixed hash so unknown usernames cost the same as wrong passwords.
export const DUMMY_HASH = await hashPassword(randomToken());

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
export const RESERVED_SLUGS = new Set(['api', 'c', '_', 'health', 'robots.txt', 'favicon.ico', 'sitemap.xml', 'login', 'admin']);

export function slugify(title) {
  const s = String(title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return s || 'artifact';
}

export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Content capability: <artifactId>.<version>.<epoch>.<expiresAtSec>.<hmac>. Lives in the URL path so relative asset URLs carry it.
export function signContent(secret, artifactId, version, epoch, ttlSec) {
  const body = `${artifactId}.${version}.${epoch}.${Math.floor(Date.now() / 1000) + ttlSec}`;
  return `${body}.${b64u(crypto.createHmac('sha256', secret).update(body).digest())}`;
}

export function verifyContent(secret, token) {
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)\.([\w-]+)$/.exec(token || '');
  if (!m) return null;
  const body = `${m[1]}.${m[2]}.${m[3]}.${m[4]}`;
  if (!safeEqual(m[5], b64u(crypto.createHmac('sha256', secret).update(body).digest()))) return null;
  if (Number(m[4]) < Date.now() / 1000) return null;
  return { artifactId: Number(m[1]), version: Number(m[2]), epoch: Number(m[3]) };
}

const ROBOTS_META = '<meta name="robots" content="noindex, nofollow, noarchive">';

// Inject robots meta + bridge client as the first thing in <head> (or the document, if there is no head).
export function injectIntoHtml(html, clientJs) {
  const inject = `${ROBOTS_META}<script>${clientJs}</script>`;
  const head = /<head(\s[^>]*)?>/i.exec(html);
  if (head) return html.slice(0, head.index + head[0].length) + inject + html.slice(head.index + head[0].length);
  const doctype = /^\s*<!doctype[^>]*>/i.exec(html);
  if (doctype) return doctype[0] + inject + html.slice(doctype[0].length);
  return inject + html;
}

const TYPES = {
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', json: 'application/json',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2',
  ttf: 'font/ttf', otf: 'font/otf', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg',
  wav: 'audio/wav', pdf: 'application/pdf', txt: 'text/plain; charset=utf-8', csv: 'text/csv; charset=utf-8',
  xml: 'application/xml', wasm: 'application/wasm', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
export const guessType = (p) => TYPES[String(p).split('.').pop().toLowerCase()] || 'application/octet-stream';

// Asset paths are relative, no traversal, no leading slash, conservative charset.
export const ASSET_PATH_RE = /^(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;
