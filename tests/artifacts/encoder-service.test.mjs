// The artifacts-encoder compose service as deployed: the app image alone (no source mounted), started with the
// command, limits and environment `docker compose config` resolves from compose.postgres-app.yml, given an encoder env
// file holding only DATABASE_URL, REDIS_URL and ARTIFACTS_S3_*. It must take a job from Redis and finish it.
// Run: docker build -t <tag> . && ARTIFACTS_APP_IMAGE=<tag> node --test tests/artifacts/encoder-service.test.mjs
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { DATABASE_URL, PORTS, REDIS_URL, ROOT, S3_ENV, removeContainers, startServices } from './stack.mjs'

const run = promisify(execFile)
const IMAGE = process.env.ARTIFACTS_APP_IMAGE
const NAME = `artifacts-test-encoder-${PORTS.app}`
const ENCODER_ENV = { DATABASE_URL, REDIS_URL, ...S3_ENV }
let services, dir

before(async () => {
  assert.ok(IMAGE, 'set ARTIFACTS_APP_IMAGE to an image built from this Dockerfile')
  services = await startServices()
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-encoder-service-'))
}, { timeout: 180000 })

after(async () => {
  await run('docker', ['rm', '-f', '-v', NAME]).catch(() => {})
  await services?.pool.end()
  removeContainers()
  if (dir) fs.rmSync(dir, { recursive: true, force: true })
})

async function composeService(envFile) {
  const placeholder = path.join(dir, 'unused.env')
  fs.writeFileSync(placeholder, '')
  // The app service's required variables only need to resolve; config never starts anything.
  const { stdout } = await run('docker', ['compose', '-f', path.join(ROOT, 'compose.postgres-app.yml'), 'config', '--format', 'json', 'artifacts-encoder'], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME, PORTFOLIO_APP_IMAGE: IMAGE, PORTFOLIO_ENCODER_ENV_FILE: envFile,
      PORTFOLIO_EXISTING_ENV_FILE: placeholder, PORTFOLIO_DATABASE_ENV_FILE: placeholder, PORTFOLIO_IMAGES_PATH: dir, PORTFOLIO_INVOICE_SIGNATURE_FILE: placeholder },
  })
  return JSON.parse(stdout).services['artifacts-encoder']
}

test('the encoder service runs from the app image with only its own env file, and finishes a queued job', { timeout: 300000 }, async () => {
  const envFile = path.join(dir, 'encoder.env')
  fs.writeFileSync(envFile, Object.entries(ENCODER_ENV).map(([k, v]) => `${k}=${v}`).join('\n') + '\n')
  const svc = await composeService(envFile)
  assert.equal(svc.image, IMAGE)
  assert.deepEqual(Object.keys(svc.environment).sort(), Object.keys(ENCODER_ENV).sort())

  await run('docker', ['run', '--rm', '--user', `${process.getuid()}:${process.getgid()}`, '-v', `${dir}:/w`, '--entrypoint', 'ffmpeg', IMAGE,
    '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=24', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '/w/clip.mp4'])
  const s3 = await import(path.join(ROOT, 'lib/artifacts/s3.mjs'))
  const clip = fs.readFileSync(path.join(dir, 'clip.mp4'))
  await s3.putObject('o/service', clip, 'video/mp4')
  await services.pool.query("INSERT INTO artifacts.blobs(key, size, stored_bytes, content_type, video_status) VALUES ('o/service', $1, $1, 'video/mp4', 'pending')", [clip.length])

  // The service as compose would start it; host networking stands in for portfolio_network to reach the test stack.
  await run('docker', ['run', '-d', '--name', NAME, '--network', 'host', ...(svc.init ? ['--init'] : []), '--restart', 'no',
    '--cpus', String(svc.cpus), '--memory', String(svc.mem_limit), '--memory-swap', String(svc.memswap_limit), '--pids-limit', String(svc.pids_limit),
    ...svc.volumes.map((v) => ['--mount', `type=volume,target=${v.target}`]).flat(),
    ...Object.entries(svc.environment).flatMap(([k, v]) => ['-e', `${k}=${v}`]),
    IMAGE, ...svc.command])
  // Queued after start: the long-running loop (not --once) must pick it up.
  const { Redis } = await import('ioredis')
  const r = new Redis(REDIS_URL)
  await r.lpush('artifacts:encode', 'o/service')
  r.disconnect()

  let row
  for (const end = Date.now() + 180000; Date.now() < end; await new Promise((res) => setTimeout(res, 1000))) {
    ;({ rows: [row] } = await services.pool.query("SELECT video_status, renditions, error FROM artifacts.blobs WHERE key = 'o/service'"))
    if (row.video_status !== 'pending') break
  }
  const { stdout: logs } = await run('docker', ['logs', NAME])
  assert.equal(row.video_status, 'ready', `${row.error}\n${logs}`)
  assert.deepEqual(row.renditions, [360])
  assert.match(logs, /ready o\/service 360/)
  assert.match(await (await s3.getObject('h/o/service/master.m3u8')).text(), /360\/index\.m3u8/)
  assert.equal((await run('docker', ['inspect', '-f', '{{.State.Running}}', NAME])).stdout.trim(), 'true')
})
