// MCP over streamable HTTP (stateless JSON responses), authenticated with the agent API tokens.
// Each tool is one agent API call; large-file upload is left to the CLI.
import { HttpError, errorResponse, json, readJson } from './db'
import { agentApi, bearerActor } from './api'

type Tool = { name: string; description: string; method: string; path: (a: any) => string; body?: (a: any) => unknown; props: Record<string, object>; required?: string[] }

const ref = { ref: { type: 'string', description: 'Artifact slug or id' } }
const str = (description: string) => ({ type: 'string', description })
const obj = (description: string) => ({ type: 'object', description })
const pick = (a: any, keys: string[]) => Object.fromEntries(keys.filter((k) => a[k] !== undefined).map((k) => [k, a[k]]))
const enc = encodeURIComponent

const TOOLS: Tool[] = [
  { name: 'list_artifacts', description: 'List every artifact with its URL, general access, share and response counts and storage.', method: 'GET', path: () => 'artifacts', props: {} },
  { name: 'get_artifact', description: 'One artifact: versions, files (with video status), shares, state revision, storage.', method: 'GET', path: (a) => `artifacts/${enc(a.ref)}`, props: ref, required: ['ref'] },
  {
    name: 'create_artifact', description: 'Publish a new artifact from HTML and small inline files. Returns its URL. New artifacts are restricted until general access is set.',
    method: 'POST', path: () => 'artifacts', body: (a) => pick(a, ['title', 'slug', 'html', 'files', 'note', 'access']),
    props: { title: str('Title'), slug: str('Optional slug'), html: str('index.html content'), files: { type: 'array', description: '[{path, content | base64, contentType?}]', items: { type: 'object' } }, note: str('Version note'), access: obj('Optional general access {kind, role, password?, generatePassword?}') },
    required: ['title', 'html'],
  },
  {
    name: 'publish_version', description: 'New version from the current files plus these changes (replace: true starts empty).', method: 'POST', path: (a) => `artifacts/${enc(a.ref)}/versions`,
    body: (a) => pick(a, ['html', 'files', 'removeFiles', 'note', 'replace']),
    props: { ...ref, html: str('New index.html'), files: { type: 'array', items: { type: 'object' } }, removeFiles: { type: 'array', items: { type: 'string' } }, note: str('Version note'), replace: { type: 'boolean' } }, required: ['ref'],
  },
  { name: 'rollback_artifact', description: 'New version that copies an old one.', method: 'POST', path: (a) => `artifacts/${enc(a.ref)}/rollback`, body: (a) => ({ version: a.version }), props: { ...ref, version: { type: 'integer' } }, required: ['ref', 'version'] },
  {
    name: 'update_artifact', description: 'Rename, change the slug, or set response settings {who: anonymous|declared|account, open, feedback: none|score|answers, notifyOwner}.',
    method: 'PATCH', path: (a) => `artifacts/${enc(a.ref)}`, body: (a) => pick(a, ['title', 'slug', 'responses']), props: { ...ref, title: str('New title'), slug: str('New slug (old links break)'), responses: obj('Response settings') }, required: ['ref'],
  },
  { name: 'delete_artifact', description: 'Delete an artifact with its versions, files, state, shares and responses.', method: 'DELETE', path: (a) => `artifacts/${enc(a.ref)}`, props: ref, required: ['ref'] },
  {
    name: 'set_general_access', description: 'General access: restricted, link or password, with the role it grants. generatePassword returns a new shared password once.',
    method: 'PUT', path: (a) => `artifacts/${enc(a.ref)}/access`, body: (a) => pick(a, ['kind', 'role', 'password', 'generatePassword']),
    props: { ...ref, kind: { type: 'string', enum: ['restricted', 'link', 'password'] }, role: { type: 'string', enum: ['viewer', 'responder', 'editor'] }, password: str('Shared password (8+ chars)'), generatePassword: { type: 'boolean' } }, required: ['ref'],
  },
  { name: 'list_shares', description: 'Accounts an artifact is shared with and their roles.', method: 'GET', path: (a) => `artifacts/${enc(a.ref)}/shares`, props: ref, required: ['ref'] },
  {
    name: 'share_artifact', description: 'Share with an email and role (or change the role). Sends an invitation unless notify is false; then a new account gets a password returned once.',
    method: 'PUT', path: (a) => `artifacts/${enc(a.ref)}/shares`, body: (a) => pick(a, ['email', 'role', 'alias', 'notify']),
    props: { ...ref, email: str('Email'), role: { type: 'string', enum: ['viewer', 'responder', 'editor'] }, alias: str('Name shown instead of the email'), notify: { type: 'boolean' } }, required: ['ref', 'email', 'role'],
  },
  { name: 'remove_share', description: 'Remove a share; the account loses access at once.', method: 'DELETE', path: (a) => `artifacts/${enc(a.ref)}/shares/${enc(a.account)}`, props: { ...ref, account: str('Account email or id') }, required: ['ref', 'account'] },
  { name: 'resend_invitation', description: 'Send the invitation again.', method: 'POST', path: (a) => `artifacts/${enc(a.ref)}/shares/${enc(a.account)}/resend`, props: { ...ref, account: str('Account email or id') }, required: ['ref', 'account'] },
  { name: 'list_accounts', description: 'Every account with the artifacts shared with it.', method: 'GET', path: () => 'accounts', props: {} },
  { name: 'set_account_alias', description: 'Set the name shown instead of an email.', method: 'PATCH', path: (a) => `accounts/${enc(a.account)}`, body: (a) => ({ alias: a.alias }), props: { account: str('Email or id'), alias: str('Alias') }, required: ['account'] },
  { name: 'delete_account', description: 'Delete an account: it loses access to everything.', method: 'DELETE', path: (a) => `accounts/${enc(a.account)}`, props: { account: str('Email or id') }, required: ['account'] },
  {
    name: 'reset_account_password', description: 'End all sessions and reset the password: emails a reset link, or with notify false returns a new password once.',
    method: 'POST', path: (a) => `accounts/${enc(a.account)}/reset`, body: (a) => ({ notify: a.notify }), props: { account: str('Email or id'), notify: { type: 'boolean' } }, required: ['account'],
  },
  { name: 'get_state', description: 'Read the state (optionally an older revision).', method: 'GET', path: (a) => `artifacts/${enc(a.ref)}/state${a.rev ? `?rev=${Number(a.rev)}` : ''}`, props: { ...ref, rev: { type: 'integer' } }, required: ['ref'] },
  {
    name: 'put_state', description: 'Seed or replace the state. baseRev makes it fail with a conflict if someone saved since.', method: 'PUT', path: (a) => `artifacts/${enc(a.ref)}/state`,
    body: (a) => pick(a, ['state', 'baseRev']), props: { ...ref, state: { description: 'Any JSON' }, baseRev: { type: 'integer' } }, required: ['ref', 'state'],
  },
  { name: 'state_history', description: 'State revisions: who saved and when.', method: 'GET', path: (a) => `artifacts/${enc(a.ref)}/state/history`, props: ref, required: ['ref'] },
  { name: 'export_responses', description: 'All responses with who sent each, when, and the score.', method: 'GET', path: (a) => `artifacts/${enc(a.ref)}/responses`, props: ref, required: ['ref'] },
  { name: 'delete_response', description: 'Delete one response.', method: 'DELETE', path: (a) => `artifacts/${enc(a.ref)}/responses/${enc(a.id)}`, props: { ...ref, id: { type: 'integer' } }, required: ['ref', 'id'] },
  {
    name: 'set_answer_key', description: 'Publish the answer key {questionId: {answer, points?}} and regrade stored responses. Never served to visitors.',
    method: 'PUT', path: (a) => `artifacts/${enc(a.ref)}/answer-key`, body: (a) => ({ key: a.key }), props: { ...ref, key: obj('Answer key') }, required: ['ref', 'key'],
  },
  { name: 'get_answer_key', description: 'Read the answer key.', method: 'GET', path: (a) => `artifacts/${enc(a.ref)}/answer-key`, props: ref, required: ['ref'] },
  { name: 'storage', description: 'Storage used against the cap, per artifact.', method: 'GET', path: () => 'storage', props: {} },
]

const PROTOCOL = '2025-06-18'

async function call(req: Request, by: string, msg: any) {
  const { method, params } = msg
  if (method === 'initialize') {
    return { protocolVersion: params?.protocolVersion || PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: 'artifacts', version: '1.0.0' } }
  }
  if (method === 'ping') return {}
  if (method === 'tools/list') {
    return { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: { type: 'object', properties: t.props, required: t.required ?? [] } })) }
  }
  if (method === 'tools/call') {
    const tool = TOOLS.find((t) => t.name === params?.name)
    if (!tool) throw Object.assign(new Error(`Unknown tool ${params?.name}`), { rpc: -32602 })
    const args = params.arguments ?? {}
    const missing = (tool.required ?? []).filter((k) => args[k] === undefined)
    if (missing.length) return { isError: true, content: [{ type: 'text', text: `Missing arguments: ${missing.join(', ')}` }] }
    const url = new URL(`/api/v1/${tool.path(args)}`, req.url)
    const body = tool.body ? JSON.stringify(tool.body(args)) : undefined
    const inner = new Request(url, { method: tool.method, body, headers: { 'Content-Type': 'application/json' } })
    let res: Response
    try {
      res = await agentApi(inner, url.pathname.split('/').filter(Boolean).slice(2).map(decodeURIComponent), url, by)
    } catch (e) {
      res = errorResponse(e)
    }
    return { isError: !res.ok, content: [{ type: 'text', text: await res.text() }] }
  }
  throw Object.assign(new Error(`Method not found: ${method}`), { rpc: -32601 })
}

export async function mcp(req: Request) {
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } })
  const by = await bearerActor(req)
  if (!by) throw new HttpError(401, 'unauthorized', 'Missing or invalid bearer token', { auth: true })
  const msg = await readJson(req, 1 << 20).catch(() => null)
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid request' } }, 400)
  if (msg.id === undefined) return new Response(null, { status: 202 }) // a notification
  try {
    return json({ jsonrpc: '2.0', id: msg.id, result: await call(req, `${by}:mcp`, msg) })
  } catch (e: any) {
    return json({ jsonrpc: '2.0', id: msg.id, error: { code: e.rpc ?? -32603, message: e.message } })
  }
}
