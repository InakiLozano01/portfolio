// Artifacts video encoder (ADR 0002). Takes blob keys from the Redis list artifacts:encode, encodes the uploaded video
// to HLS (360p, 720p, 1080p, never above the source) plus a poster, stores them under h/<key>/ and deletes the original.
// Runs in the portfolio image (it has ffmpeg) as its own container: node scripts/artifacts-encoder.mjs [--once]
// Env: DATABASE_URL, REDIS_URL, ARTIFACTS_S3_*; ARTIFACTS_ENCODER_TMP for scratch space (default the OS temp dir).
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { promisify } from 'node:util'
import { createRequire } from 'node:module'
import { deleteObject, deletePrefix, getObject, putObject } from '../lib/artifacts/s3.mjs'

// require(): the image's traced node_modules carry only the CommonJS entries of pg and ioredis.
const require = createRequire(import.meta.url)
const pg = require('pg')
const { Redis } = require('ioredis')
const run = promisify(execFile)
const QUEUE = 'artifacts:encode'
const PROCESSING = 'artifacts:encode:processing'
const LADDER = [
  { height: 360, video: '800k', max: '856k', buf: '1200k' },
  { height: 720, video: '2800k', max: '2996k', buf: '4200k' },
  { height: 1080, video: '5000k', max: '5350k', buf: '7500k' },
]
const TYPES = { m3u8: 'application/vnd.apple.mpegurl', ts: 'video/mp2t', jpg: 'image/jpeg' }
const once = process.argv.includes('--once')
const log = (...a) => console.log(new Date().toISOString(), ...a)

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2, application_name: 'artifacts-encoder' })
const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })

async function probe(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file])
  const info = JSON.parse(stdout)
  const v = info.streams.find((s) => s.codec_type === 'video' && s.disposition?.attached_pic !== 1)
  if (!v || !v.width || !v.height) throw new Error('no video stream')
  const rotation = Math.abs(Number(v.tags?.rotate ?? v.side_data_list?.find((d) => d.rotation != null)?.rotation ?? 0)) % 180
  return {
    height: rotation === 90 ? v.width : v.height,
    audio: info.streams.some((s) => s.codec_type === 'audio'),
    duration: Number(info.format?.duration) || 0,
  }
}

async function encode(input, out, src) {
  const ladder = LADDER.filter((r) => r.height <= src.height)
  // A source below 360p is kept at its own height (rounded down to even).
  const rungs = ladder.length ? ladder : [{ ...LADDER[0], height: src.height - (src.height % 2) }]
  const n = rungs.length
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', input,
    '-filter_complex', `[0:v]split=${n}${rungs.map((_, i) => `[s${i}]`).join('')};${rungs.map((r, i) => `[s${i}]scale=-2:${r.height}[v${i}]`).join(';')}`]
  rungs.forEach((r, i) => {
    args.push('-map', `[v${i}]`, `-c:v:${i}`, 'libx264', `-b:v:${i}`, r.video, `-maxrate:v:${i}`, r.max, `-bufsize:v:${i}`, r.buf)
    if (src.audio) args.push('-map', 'a:0')
  })
  args.push('-preset', 'veryfast', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-g', '48', '-keyint_min', '48', '-sc_threshold', '0')
  if (src.audio) args.push('-c:a', 'aac', '-b:a', '128k', '-ac', '2')
  args.push('-f', 'hls', '-hls_time', '6', '-hls_playlist_type', 'vod', '-hls_segment_filename', path.join(out, '%v', 'seg_%03d.ts'),
    '-master_pl_name', 'master.m3u8', '-var_stream_map', rungs.map((r, i) => `v:${i}${src.audio ? `,a:${i}` : ''},name:${r.height}`).join(' '),
    path.join(out, '%v', 'index.m3u8'))
  await run('ffmpeg', args, { maxBuffer: 1 << 24 })
  const at = Math.min(1, src.duration / 2)
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(at), '-i', input, '-frames:v', '1',
    '-vf', `scale=-2:${Math.min(720, rungs.at(-1).height)}`, '-q:v', '3', path.join(out, 'poster.jpg')])
  return rungs.map((r) => r.height)
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
}

async function processJob(key) {
  const { rows: [blob] } = await db.query("SELECT key FROM artifacts.blobs WHERE key = $1 AND video_status = 'pending'", [key])
  if (!blob) return log('skip', key, '(not pending)')
  const work = fs.mkdtempSync(path.join(process.env.ARTIFACTS_ENCODER_TMP || os.tmpdir(), 'encode-'))
  const input = path.join(work, 'input')
  const out = path.join(work, 'out')
  try {
    log('encode', key)
    const res = await getObject(key)
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(input))
    const src = await probe(input)
    const heights = await encode(input, out, src)
    let bytes = 0
    for (const file of walk(out)) {
      const rel = path.relative(out, file).split(path.sep).join('/')
      const body = fs.readFileSync(file)
      bytes += body.length
      await putObject(`h/${key}/${rel}`, body, TYPES[rel.split('.').pop()] || 'application/octet-stream')
    }
    await db.query("UPDATE artifacts.blobs SET video_status = 'ready', stored_bytes = $2, renditions = $3::jsonb, error = NULL WHERE key = $1",
      [key, bytes, JSON.stringify(heights)])
    log('ready', key, heights.join('/'), bytes)
  } catch (e) {
    const message = String(e.stderr || e.message || e).trim().split('\n').slice(-3).join(' ').slice(0, 300)
    log('failed', key, message)
    await deletePrefix(`h/${key}/`).catch(() => {})
    await db.query("UPDATE artifacts.blobs SET video_status = 'failed', stored_bytes = 0, error = $2 WHERE key = $1", [key, message])
  } finally {
    fs.rmSync(work, { recursive: true, force: true })
  }
  // The original is never kept (ADR 0002): not after success, not after a failure.
  await deleteObject(key).catch((e) => log('delete original failed', key, e.message))
}

async function main() {
  // Jobs a crashed run left half done go back to the queue.
  while (await redis.lmove(PROCESSING, QUEUE, 'RIGHT', 'RIGHT')) {}
  for (;;) {
    const key = once ? await redis.lmove(QUEUE, PROCESSING, 'RIGHT', 'LEFT') : await redis.blmove(QUEUE, PROCESSING, 'RIGHT', 'LEFT', 30)
    if (!key) { if (once) break; continue }
    await processJob(key)
    await redis.lrem(PROCESSING, 1, key)
  }
}

main().then(() => process.exit(0), (e) => { log('fatal', e); process.exit(1) })
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => process.exit(0))
