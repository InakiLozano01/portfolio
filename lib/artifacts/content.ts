// The content origin (artifacts-content.inakilozano.com): artifact files only, GET and HEAD, never cookies.
import fs from 'node:fs'
import path from 'node:path'
import { CFG, ROBOTS, SANDBOX, contentSecret, one } from './db'
import { clientJs } from './client'
import * as S from './store'
import { getObject } from './s3.mjs'
import { ASSET_PATH_RE, injectIntoHtml, verifyContent } from './util'

const HLS_TYPES: Record<string, string> = { m3u8: 'application/vnd.apple.mpegurl', ts: 'video/mp2t', jpg: 'image/jpeg' }
const HLS_REST_RE = /^(?:master\.m3u8|poster\.jpg|\d{3,4}\/(?:index\.m3u8|seg_\d{1,5}\.ts))$/

// The referrer is the origin only, never the capability path; embedded players such as YouTube refuse requests without one.
const base = () => ({
  'X-Robots-Tag': ROBOTS, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store',
})
const text = (status: number, body: string) => new Response(body, { status, headers: { ...base(), 'Content-Type': 'text/plain; charset=utf-8' } })

let hlsJs: Buffer | null = null

/** Proxies an object with the browser's Range header, so video and large files can seek. */
async function stream(req: Request, key: string, contentType: string, size: number | null, headers: Record<string, string>) {
  const h: Record<string, string> = { ...headers, 'Content-Type': contentType, 'Accept-Ranges': 'bytes' }
  if (req.method === 'HEAD' && size != null) return new Response(null, { headers: { ...h, 'Content-Length': String(size) } })
  const obj = await getObject(key, req.headers.get('range') || undefined)
  for (const name of ['content-length', 'content-range']) {
    const v = obj.headers.get(name)
    if (v) h[name === 'content-length' ? 'Content-Length' : 'Content-Range'] = v
  }
  return new Response(req.method === 'HEAD' ? null : obj.body, { status: obj.status, headers: h })
}

export async function handleContent(req: Request, p: string): Promise<Response> {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return text(405, 'Method not allowed')
    if (p === '/robots.txt') return text(200, 'User-agent: *\nDisallow: /\n')
    if (p === '/_/hls.js') {
      hlsJs ??= fs.readFileSync(path.join(process.cwd(), 'node_modules/hls.js/dist/hls.light.min.js'))
      return new Response(new Uint8Array(hlsJs), { headers: { ...base(), 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } })
    }
    const m = /^\/c\/([^/]+)(\/.*)?$/.exec(p)
    if (!m) return text(404, 'Not found.')
    // Next.js strips trailing slashes before routing, so the artifact's root is addressed as index.html.
    if (!m[2]) return new Response(null, { status: 302, headers: { ...base(), Location: `/c/${m[1]}/index.html` } })
    const cap = verifyContent(await contentSecret(), m[1])
    const a = cap && (await one('SELECT id::int, cap_epoch FROM artifacts.artifacts WHERE id = $1', [cap.artifactId]))
    if (!cap || !a || a.cap_epoch !== cap.epoch) return text(403, 'Link expired, reload the page.')
    let file: string
    try { file = decodeURIComponent(m[2].slice(1)) } catch { return text(404, 'Not found.') }
    if (file === '' || file.endsWith('/')) file += 'index.html'
    const headers = { ...base(), 'Content-Security-Policy': `sandbox ${SANDBOX}; frame-ancestors ${CFG.appOrigin()}`, 'Cache-Control': 'private, max-age=300' }

    const hls = file.indexOf('/hls/')
    if (hls > 0) {
      const video = file.slice(0, hls)
      const rest = file.slice(hls + 5)
      const f = ASSET_PATH_RE.test(video) && HLS_REST_RE.test(rest) ? await S.fileAt(a.id, cap.version, video) : null
      if (!f || f.video_status !== 'ready') return text(404, 'Not found.')
      return stream(req, `h/${f.key}/${rest}`, HLS_TYPES[rest.split('.').pop()!], null, headers)
    }
    if (!ASSET_PATH_RE.test(file)) return text(404, 'Not found.')
    const f = await S.fileAt(a.id, cap.version, file)
    if (!f) return text(404, 'Not found.')
    if (f.video_status === 'ready') return new Response(null, { status: 302, headers: { ...headers, Location: `/c/${m[1]}/${file}/hls/master.m3u8` } })
    if (f.video_status) return text(409, f.video_status === 'pending' ? 'Video is still encoding.' : 'Video encoding failed.')
    if (f.content_type.startsWith('text/html')) {
      const html = await (await getObject(f.key)).text()
      return new Response(injectIntoHtml(html, clientJs(CFG.appOrigin())), { headers: { ...headers, 'Content-Type': f.content_type } })
    }
    return stream(req, f.key, f.content_type, f.size, headers)
  } catch (e) {
    console.error('[artifacts content]', e)
    return text(500, 'Internal error')
  }
}
