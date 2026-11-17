// Seam B, continued: what the encoder accepts and refuses. A 1080p source, MOV, WebM and MKV uploads, and files
// disguised as .mp4 that point ffmpeg at a local file. Run: node --test tests/artifacts/video.test.mjs
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { DATABASE_URL, REDIS_URL, ROOT, S3_ENV, removeContainers, startServices } from './stack.mjs'

const run = promisify(execFile)
const IMAGE = process.env.ARTIFACTS_ENCODER_IMAGE || 'portfolio-invoice-notes:20261102'
const SECRET = 'LOCAL-SECRET-7f3a91'
let services, s3, dir, status, stdout

const ffmpeg = (...args) => run('docker', ['run', '--rm', '--user', `${process.getuid()}:${process.getgid()}`, '-v', `${dir}:/w`, '-w', '/w',
  '--entrypoint', 'ffmpeg', IMAGE, '-hide_banner', '-loglevel', 'error', '-y', ...args])
const pattern = (size) => ['-f', 'lavfi', '-i', `testsrc=size=${size}:rate=24`, '-f', 'lavfi', '-i', 'sine', '-t', '2', '-shortest']
const H264 = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac']

async function queue(key, file, type) {
  const body = fs.readFileSync(path.join(dir, file))
  await s3.putObject(key, body, type)
  await services.pool.query("INSERT INTO artifacts.blobs(key, size, stored_bytes, content_type, video_status) VALUES ($1, $2, $2, $3, 'pending')", [key, body.length, type])
  const { Redis } = await import('ioredis')
  const r = new Redis(REDIS_URL)
  await r.lpush('artifacts:encode', key)
  r.disconnect()
}

const objects = async (prefix) =>
  [...(await (await s3.s3('GET', null, { query: `list-type=2&prefix=${encodeURIComponent(prefix)}` })).text()).matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1])

before(async () => {
  services = await startServices()
  s3 = await import(path.join(ROOT, 'lib/artifacts/s3.mjs'))
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-video-'))
  await ffmpeg(...pattern('1920x1080'), ...H264, 'full-hd.mp4')
  await ffmpeg(...pattern('640x360'), ...H264, 'clip.mov')
  await ffmpeg(...pattern('640x360'), '-c:v', 'libvpx-vp9', '-b:v', '200k', '-c:a', 'libopus', 'clip.webm')
  await ffmpeg(...pattern('640x360'), ...H264, 'clip.mkv')
  // The local file the payloads point at: a playable clip whose metadata carries a marker, mounted into the encoder.
  fs.mkdirSync(path.join(dir, 'secret'))
  await ffmpeg('-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=24', '-t', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-metadata', `service_name=${SECRET}`, '-f', 'mpegts', 'secret/clip.ts')
  fs.writeFileSync(path.join(dir, 'hls.mp4'), '#EXTM3U\n#EXT-X-TARGETDURATION:1\n#EXTINF:1,\nfile:///secret/clip.ts\n#EXT-X-ENDLIST\n')
  fs.writeFileSync(path.join(dir, 'concat.mp4'), 'ffconcat version 1.0\nfile /secret/clip.ts\n')
  fs.writeFileSync(path.join(dir, 'concat-relative.mp4'), 'ffconcat version 1.0\nfile clip.ts\n')

  await queue('o/full-hd', 'full-hd.mp4', 'video/mp4')
  await queue('o/mov', 'clip.mov', 'video/quicktime')
  await queue('o/webm', 'clip.webm', 'video/webm')
  await queue('o/mkv', 'clip.mkv', 'video/x-matroska')
  for (const p of ['hls', 'concat', 'concat-relative']) await queue(`o/${p}`, `${p}.mp4`, 'video/mp4')

  const env = { ...S3_ENV, DATABASE_URL, REDIS_URL }
  ;({ stdout } = await run('docker', ['run', '--rm', '--network', 'host', '-v', `${ROOT}:/w:ro`, '-v', `${dir}/secret:/secret:ro`,
    ...Object.entries(env).flatMap(([k, v]) => ['-e', `${k}=${v}`]),
    '--entrypoint', 'node', IMAGE, '/w/scripts/artifacts-encoder.mjs', '--once'], { maxBuffer: 1 << 24, timeout: 600000 }))
  const { rows } = await services.pool.query('SELECT key, video_status, renditions, error FROM artifacts.blobs')
  status = Object.fromEntries(rows.map((r) => [r.key, r]))
}, { timeout: 900000 })

after(async () => {
  await services?.pool.end()
  removeContainers()
  if (dir) fs.rmSync(dir, { recursive: true, force: true })
})

test('a 1080p source yields 360, 720 and 1080 and nothing above it', async () => {
  assert.equal(status['o/full-hd'].video_status, 'ready', status['o/full-hd'].error)
  assert.deepEqual(status['o/full-hd'].renditions, [360, 720, 1080])
  const master = await (await s3.getObject('h/o/full-hd/master.m3u8')).text()
  assert.deepEqual([...master.matchAll(/RESOLUTION=(\d+x\d+)/g)].map((m) => m[1]).sort(), ['1280x720', '1920x1080', '640x360'])
  assert.deepEqual((await objects('h/o/full-hd/')).filter((k) => k.endsWith('/index.m3u8')).sort(),
    ['h/o/full-hd/1080/index.m3u8', 'h/o/full-hd/360/index.m3u8', 'h/o/full-hd/720/index.m3u8'])
})

test('MOV, WebM and MKV uploads encode', async () => {
  for (const key of ['o/mov', 'o/webm', 'o/mkv']) {
    assert.equal(status[key].video_status, 'ready', `${key}: ${status[key].error}`)
    assert.deepEqual(status[key].renditions, [360])
    assert.match(await (await s3.getObject(`h/${key}/360/index.m3u8`)).text(), /#EXT-X-ENDLIST/)
  }
})

test('a playlist or concat file disguised as .mp4 that points at a local file fails and leaks nothing', async () => {
  for (const key of ['o/hls', 'o/concat', 'o/concat-relative']) {
    assert.equal(status[key].video_status, 'failed', key)
    assert.deepEqual(await objects(`h/${key}/`), [], key)
    assert.doesNotMatch(status[key].error, new RegExp(SECRET), key)
  }
  assert.doesNotMatch(stdout, new RegExp(SECRET))
  // Nothing anywhere in the bucket carries the local file's marker.
  for (const key of await objects('h/')) assert.equal(Buffer.from(await (await s3.getObject(key)).arrayBuffer()).includes(SECRET), false, key)
  // Every original is gone, failed or not.
  assert.deepEqual(await objects('o/'), [])
})
