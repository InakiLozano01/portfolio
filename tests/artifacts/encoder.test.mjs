// Seam B: a short real clip and a corrupt file go through the encoder worker, run in the portfolio image (it has ffmpeg),
// against throwaway PostgreSQL, MinIO and Redis. Run: npm run test:artifacts:encoder
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { DATABASE_URL, REDIS_URL, ROOT, S3_ENV, removeContainers, startServices } from './stack.mjs'

const run = promisify(execFile)
const IMAGE = process.env.ARTIFACTS_ENCODER_IMAGE || 'portfolio-invoice-notes:20261102'
let services, s3, dir

before(async () => {
  services = await startServices()
  s3 = await import(path.join(ROOT, 'lib/artifacts/s3.mjs'))
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-encoder-'))
  fs.chmodSync(dir, 0o777)
  // 3 s of 1280x720 test pattern with a tone: a real H.264/AAC MP4.
  await run('docker', ['run', '--rm', '-v', `${dir}:/w`, '--entrypoint', 'ffmpeg', IMAGE, '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'testsrc=size=1280x720:rate=24', '-f', 'lavfi', '-i', 'sine=frequency=440', '-t', '3',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '/w/clip.mp4'])
}, { timeout: 180000 })

after(async () => {
  await services?.pool.end()
  removeContainers()
  if (dir) await run('docker', ['run', '--rm', '-v', `${dir}:/w`, '--entrypoint', 'sh', IMAGE, '-c', 'rm -rf /w/*']).catch(() => {})
  if (dir) fs.rmSync(dir, { recursive: true, force: true })
})

async function queue(key, body) {
  await s3.putObject(key, body, 'video/mp4')
  await services.pool.query("INSERT INTO artifacts.blobs(key, size, stored_bytes, content_type, video_status) VALUES ($1, $2, $2, 'video/mp4', 'pending')", [key, body.length])
  const { Redis } = await import('ioredis')
  const r = new Redis(REDIS_URL)
  await r.lpush('artifacts:encode', key)
  r.disconnect()
}

const text = async (key) => (await s3.getObject(key)).text()

test('a real clip becomes HLS renditions no higher than the source, with a poster; a corrupt file fails; originals go', { timeout: 300000 }, async () => {
  const clip = fs.readFileSync(path.join(dir, 'clip.mp4'))
  await queue('o/clip', clip)
  await queue('o/corrupt', crypto.randomBytes(50000))

  const env = { ...S3_ENV, DATABASE_URL, REDIS_URL }
  const { stdout } = await run('docker', ['run', '--rm', '--network', 'host', '-v', `${ROOT}:/w:ro`,
    ...Object.entries(env).flatMap(([k, v]) => ['-e', `${k}=${v}`]),
    '--entrypoint', 'node', IMAGE, '/w/scripts/artifacts-encoder.mjs', '--once'], { maxBuffer: 1 << 24 })
  assert.match(stdout, /ready o\/clip 360\/720/)

  const { rows } = await services.pool.query('SELECT key, video_status, renditions, stored_bytes::int AS bytes, error FROM artifacts.blobs ORDER BY key')
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))
  assert.equal(byKey['o/clip'].video_status, 'ready')
  assert.deepEqual(byKey['o/clip'].renditions, [360, 720])
  assert.ok(byKey['o/clip'].bytes > 0)
  assert.equal(byKey['o/corrupt'].video_status, 'failed')
  assert.ok(byKey['o/corrupt'].error)

  const master = await text('h/o/clip/master.m3u8')
  assert.match(master, /^#EXTM3U/)
  assert.match(master, /RESOLUTION=640x360[\s\S]*360\/index\.m3u8/)
  assert.match(master, /RESOLUTION=1280x720[\s\S]*720\/index\.m3u8/)
  assert.doesNotMatch(master, /1080/)
  for (const h of [360, 720]) {
    const playlist = await text(`h/o/clip/${h}/index.m3u8`)
    assert.match(playlist, /#EXT-X-PLAYLIST-TYPE:VOD/)
    assert.match(playlist, /#EXT-X-ENDLIST/)
    const segments = playlist.split('\n').filter((l) => /^seg_\d+\.ts$/.test(l))
    assert.ok(segments.length >= 1)
    const seg = Buffer.from(await (await s3.getObject(`h/o/clip/${h}/${segments[0]}`)).arrayBuffer())
    assert.equal(seg[0], 0x47, 'MPEG-TS sync byte')
  }
  const poster = Buffer.from(await (await s3.getObject('h/o/clip/poster.jpg')).arrayBuffer())
  assert.deepEqual([...poster.subarray(0, 2)], [0xff, 0xd8])

  for (const key of ['o/clip', 'o/corrupt', 'h/o/corrupt/master.m3u8']) await assert.rejects(s3.getObject(key), (e) => e.status === 404, key)
})
