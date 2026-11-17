// The app origin (artifacts.inakilozano.com): viewer shell, sign-in, invitation and reset pages, guest API, agent API, MCP.
import { requireAdmin } from '@/lib/admin-auth'
import { CFG, HttpError, ROBOTS, SANDBOX, contentSecret, errorResponse, json, notFound, readBody, readJson } from './db'
import * as A from './access'
import * as R from './responses'
import * as S from './store'
import { agentApi, bearerActor } from './api'
import { mcp } from './mcp'
import { SHELL_CSS, SHELL_JS } from './client'
import { SLUG_RE, escapeHtml, randomToken, signContent, ASSET_PATH_RE } from './util'

const CONTENT_TTL = 12 * 3600

const jsonForScript = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c')

function htmlResponse(html: string, nonce: string, status = 200, extra: Record<string, string> = {}) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': ROBOTS, 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; img-src 'self' data:; connect-src 'self'; frame-src ${CFG.contentOrigin()}; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
      'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', ...extra,
    },
  })
}

function page(title: string, body: string, status = 200, extra: Record<string, string> = {}) {
  const nonce = randomToken(16)
  return htmlResponse(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="${ROBOTS}"><meta name="referrer" content="no-referrer"><title>${escapeHtml(title)}</title><style nonce="${nonce}">${SHELL_CSS}</style></head>
<body><main>${body}</main></body></html>`, nonce, status, extra)
}

async function bootFor(req: Request, a: S.Artifact | null, v: A.Visitor) {
  const role = a ? await A.effectiveRole(req, a, v) : null
  const pw = a ? await A.passwordSession(req, a) : null
  return {
    role,
    boot: {
      id: a?.id ?? null, slug: a?.slug ?? null, title: role ? a!.title : null, version: role ? a!.current_version : null, role,
      user: v.account ? v.account.alias || v.account.email : v.owner ? 'Propietario' : null,
      csrf: v.account?.csrf ?? pw?.csrf ?? null, access: role && a ? a.access : null,
      responses: role && a ? { who: a.responders, open: a.responses_open, feedback: a.feedback } : null,
    },
  }
}

const LOGIN_DIALOG = (locked: boolean) => `<dialog id="login" aria-labelledby="lt"><form id="lf"><h1 id="lt">${locked ? 'Ingresá para ver este contenido' : 'Ingresar'}</h1>
<label>Email<input name="email" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
<label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label>
<p id="err" role="alert"></p><div class="row"><a href="/forgot">¿Olvidaste tu contraseña?</a><button type="button" id="cancel">Cancelar</button><button type="submit" id="go" class="go">Ingresar</button></div></form></dialog>`

const UNLOCK_DIALOG = `<dialog id="unlock" aria-labelledby="ut"><form id="uf"><h1 id="ut">Este contenido tiene contraseña</h1>
<label>Contraseña<input name="password" type="password" autocomplete="off" required></label>
<p id="uerr" role="alert"></p><div class="row"><button type="button" id="toLogin" class="link">Ingresar con mi cuenta</button><button type="submit" class="go">Entrar</button></div></form></dialog>`

async function shellPage(req: Request, slug: string) {
  const v = await A.visitor(req)
  const a = await S.findArtifact(slug).catch((e) => { if (e instanceof HttpError && e.status === 404) return null; throw e })
  const { role, boot } = await bootFor(req, a, v)
  const nonce = randomToken(16)
  const cap = role && a ? `${CFG.contentOrigin()}/c/${signContent(await contentSecret(), a.id, a.current_version, a.cap_epoch, CONTENT_TTL)}/index.html` : null
  const locked = !cap
  const askPassword = locked && a?.access === 'password'
  const html = `<!doctype html><html lang="es"${locked ? ' class="locked"' : ''}><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="${ROBOTS}"><meta name="referrer" content="no-referrer">
<title>${escapeHtml(role && a ? a.title : 'Contenido privado')}</title><style nonce="${nonce}">${SHELL_CSS}</style></head><body>
${cap ? `<iframe id="f" src="${escapeHtml(cap)}" title="${escapeHtml(a!.title)}" sandbox="${SANDBOX}" allow="clipboard-write; fullscreen; autoplay" referrerpolicy="no-referrer"></iframe>
<div class="bar">${role === 'owner' ? `<a id="share" href="/share/${escapeHtml(a!.slug)}">Compartir</a>` : ''}<button id="pill" type="button" hidden></button></div>` : ''}
${LOGIN_DIALOG(locked)}${askPassword ? UNLOCK_DIALOG : ''}
<script type="application/json" id="boot">${jsonForScript(boot)}</script><script nonce="${nonce}">${SHELL_JS}</script></body></html>`
  return htmlResponse(html, nonce)
}

// ---------- guest API: called only by the shell page ----------

function checkWrite(req: Request) {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers.get('origin') !== CFG.appOrigin()) throw new HttpError(403, 'forbidden', 'Bad origin')
}

async function guestApi(req: Request, id: string, sub: string, url: URL) {
  // A custom header forces a CORS preflight (never answered), so only same-origin script can call this API.
  if (req.headers.get('x-artifact-shell') !== '1') throw new HttpError(403, 'forbidden', 'Missing X-Artifact-Shell header')
  checkWrite(req)
  if (!/^\d+$/.test(id)) throw notFound()
  const a = await S.findArtifact(id)
  const v = await A.visitor(req)
  const M = req.method
  if (sub === 'unlock' && M === 'POST') {
    const r = await A.unlock(req, a, (await readJson(req, 4096)).password)
    return json({ ok: true }, 200, { 'Set-Cookie': r.setCookie })
  }
  const { role, boot } = await bootFor(req, a, v)
  if (sub === 'info' && M === 'GET') return json(boot)
  if (!role) throw notFound()
  if (M !== 'GET') {
    // Ambient sessions also need their CSRF token; the owner's session is covered by the header and Origin checks.
    const pw = await A.passwordSession(req, a)
    const sent = req.headers.get('x-artifact-csrf') || ''
    if ((v.account || pw) && sent !== v.account?.csrf && sent !== pw?.csrf) throw new HttpError(403, 'csrf', 'Bad CSRF token')
  }
  const needEditor = () => { if (!A.atLeast(role, 'editor')) throw new HttpError(403, 'forbidden', 'Solo los editores pueden hacer esto') }
  if (sub === 'state' && M === 'GET') {
    const rev = Number(url.searchParams.get('rev')) || 0
    if (rev) needEditor()
    return json(await S.latestState(a, rev))
  }
  const by = v.owner ? 'owner' : v.account ? v.account.alias || v.account.email : 'shared password'
  if (sub === 'state' && M === 'PUT') { needEditor(); return json(await S.saveState(a, await readJson(req, (2 << 20) + 4096), by)) }
  if (sub === 'state/history' && M === 'GET') { needEditor(); return json(await S.stateHistory(a)) }
  if (sub === 'response' && M === 'GET') return json(await R.getOwnResponse(req, a, v))
  if (sub === 'response' && M === 'PUT') {
    const r = await R.submitResponse(req, a, v, role, await readJson(req, (256 << 10) + 4096))
    return json({ response: r.response }, 200, r.setCookie ? { 'Set-Cookie': r.setCookie } : {})
  }
  if (sub === 'video' && M === 'GET') {
    const p = url.searchParams.get('path') || ''
    const f = ASSET_PATH_RE.test(p) ? await S.fileAt(a.id, a.current_version, p) : null
    if (!f || !f.video_status) throw notFound('Video')
    return json({ status: f.video_status })
  }
  throw notFound('Endpoint')
}

// ---------- sign-in, invitation and reset ----------

async function formBody(req: Request) {
  return new URLSearchParams((await readBody(req, 8192)).toString('utf8'))
}

function setPasswordPage(token: string, info: { kind: string; email: string }, error = '') {
  return page('Elegir contraseña', `<form method="post" action="/api/password/set"><h1>${info.kind === 'invite' ? 'Elegí tu contraseña' : 'Elegí una contraseña nueva'}</h1>
<p>${escapeHtml(info.email)}</p><input type="hidden" name="token" value="${escapeHtml(token)}">
<input type="hidden" name="email" value="${escapeHtml(info.email)}" autocomplete="username">
<label>Contraseña (mínimo 8 caracteres)<input name="password" type="password" minlength="8" maxlength="200" autocomplete="new-password" required></label>
<p role="alert">${escapeHtml(error)}</p><div class="row"><button type="submit" class="go">Guardar y entrar</button></div></form>`, error ? 400 : 200)
}

const expiredPage = () => page('Enlace vencido', '<h1>Este enlace ya se usó o venció</h1><p>Pedí uno nuevo desde <a href="/forgot">restablecer contraseña</a> o a quien te compartió el contenido.</p>', 410)

async function sessionApi(req: Request, sub: string) {
  checkWrite(req)
  const M = req.method
  if (sub === 'session' && M === 'POST') {
    if (req.headers.get('x-artifact-shell') !== '1') throw new HttpError(403, 'forbidden', 'Missing X-Artifact-Shell header')
    const r = await A.signIn(req, await readJson(req, 4096))
    return json({ ok: true, owner: r.owner }, 200, { 'Set-Cookie': r.setCookie })
  }
  if (sub === 'session' && M === 'DELETE') {
    const headers = new Headers({ 'Cache-Control': 'no-store', 'X-Robots-Tag': ROBOTS })
    headers.append('Set-Cookie', await A.signOut(req))
    headers.append('Set-Cookie', A.ownerSignOutCookie())
    return Response.json({ ok: true }, { headers })
  }
  if (sub === 'password/forgot' && M === 'POST') {
    try { await A.requestReset(req, (await formBody(req)).get('email')) } catch (e) {
      if (!(e instanceof HttpError && e.status === 429)) throw e
      return page('Demasiados intentos', '<h1>Demasiados intentos</h1><p>Probá de nuevo en unos minutos.</p>', 429)
    }
    return page('Revisá tu email', '<h1>Revisá tu email</h1><p>Si hay una cuenta con ese email, te mandamos un enlace para elegir una contraseña nueva. Vence en una hora.</p>')
  }
  if (sub === 'password/set' && M === 'POST') {
    const form = await formBody(req)
    const token = form.get('token') || ''
    try {
      const r = await A.spendPasswordToken(req, token, form.get('password') || '')
      return new Response(null, { status: 303, headers: { Location: r.slug ? `/${r.slug}` : '/', 'Set-Cookie': r.setCookie, 'Cache-Control': 'no-store', 'X-Robots-Tag': ROBOTS } })
    } catch (e) {
      if (e instanceof HttpError && e.status === 400) {
        const info = await A.peekToken(token)
        return info ? setPasswordPage(token, info, e.message) : expiredPage()
      }
      if (e instanceof HttpError && e.status === 410) return expiredPage()
      throw e
    }
  }
  throw notFound('Endpoint')
}

// ---------- agent API: bearer token, or the owner's session on this origin (the share page) ----------

async function v1(req: Request, parts: string[], url: URL) {
  let by = await bearerActor(req)
  if (!by) {
    const auth = await requireAdmin(req)
    if (!auth.ok) throw new HttpError(401, 'unauthorized', 'Missing or invalid bearer token', { auth: true })
    by = 'owner'
  }
  return agentApi(req, parts, url, by)
}

export async function handleApp(req: Request, path: string): Promise<Response> {
  try {
    const url = new URL(req.url)
    if (path === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain', 'X-Robots-Tag': ROBOTS } })
    if (path === '/health') return json({ ok: true })
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent)
    if (parts[0] === 'api' && parts[1] === 'v1') return await v1(req, parts.slice(2), url)
    if (parts[0] === 'api' && parts[1] === 'a' && parts[2]) return await guestApi(req, parts[2], parts.slice(3).join('/'), url)
    if (parts[0] === 'api') return await sessionApi(req, parts.slice(1).join('/'))
    if (parts[0] === 'mcp' && parts.length === 1) return await mcp(req)
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'method_not_allowed', 'Method not allowed')
    if (!parts.length) return page('Artifacts', '<p>Nada para ver acá.</p>')
    if (parts[0] === 'forgot' && parts.length === 1) {
      return page('Restablecer contraseña', `<form method="post" action="/api/password/forgot"><h1>Restablecer contraseña</h1>
<label>Email<input name="email" type="email" autocomplete="username" required></label><div class="row"><button type="submit" class="go">Mandarme el enlace</button></div></form>`)
    }
    if ((parts[0] === 'invite' || parts[0] === 'reset') && parts.length === 2) {
      const info = await A.peekToken(parts[1])
      return info ? setPasswordPage(parts[1], info) : expiredPage()
    }
    if (parts.length !== 1 || !SLUG_RE.test(parts[0])) return page('No encontrado', '<p>No encontrado.</p>', 404)
    return await shellPage(req, parts[0])
  } catch (e) {
    return errorResponse(e)
  }
}

