import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { promisify } from 'node:util'

import {
  checkArtifactsDatabase,
  parseEnvFile,
  validateComposeConfig,
  validateEnv,
  validateMigrationFiles,
  validateNginxPatch,
} from '../../scripts/artifacts-deployment-check.mjs'

const run = promisify(execFile)

const appEnv = {
  DATABASE_URL: 'postgres://app:secret@postgres/portfolio',
  REDIS_URL: 'redis://redis:6379',
  NEXTAUTH_URL: 'https://portfolio.example',
  NEXTAUTH_SECRET: 'long-production-secret',
  SMTP_SERVER: 'smtp.example',
  SMTP_PORT: '465',
  SMTP_ENCRYPT: 'SSL',
  SMTP_USERNAME: 'mailer',
  SMTP_PASSWORD: 'mailer-secret',
  CONTACT_MAIL_FROM: 'notifications@example.com',
  ARTIFACTS_APP_ORIGIN: 'https://artifacts.example',
  ARTIFACTS_CONTENT_ORIGIN: 'https://artifacts-content.example',
  ARTIFACTS_S3_ENDPOINT: 'https://s3.example',
  ARTIFACTS_S3_BUCKET: 'artifacts',
  ARTIFACTS_S3_ACCESS_KEY: 's3-access',
  ARTIFACTS_S3_SECRET_KEY: 's3-secret',
}

const encoderEnv = {
  DATABASE_URL: appEnv.DATABASE_URL,
  REDIS_URL: appEnv.REDIS_URL,
  ARTIFACTS_S3_ENDPOINT: appEnv.ARTIFACTS_S3_ENDPOINT,
  ARTIFACTS_S3_BUCKET: appEnv.ARTIFACTS_S3_BUCKET,
  ARTIFACTS_S3_ACCESS_KEY: appEnv.ARTIFACTS_S3_ACCESS_KEY,
  ARTIFACTS_S3_SECRET_KEY: appEnv.ARTIFACTS_S3_SECRET_KEY,
}

test('parseEnvFile reads quoted values and never treats comments as variables', () => {
  assert.deepEqual(parseEnvFile('# comment\nexport FOO="bar baz"\nEMPTY=\n'), { FOO: 'bar baz', EMPTY: '' })
})

test('validateEnv reports missing and placeholder values without including secrets', () => {
  const result = validateEnv({ ...appEnv, NEXTAUTH_SECRET: 'your-production-secret', SMTP_PASSWORD: '' }, 'app')
  assert.deepEqual(result.missing, ['SMTP_PASSWORD'])
  assert.deepEqual(result.placeholders, ['NEXTAUTH_SECRET'])
  assert.doesNotMatch(JSON.stringify(result), /your-production-secret|mailer-secret|long-production-secret/)
})

test('validateEnv enforces the encoder allowlist and its Redis/S3 inputs', () => {
  assert.deepEqual(validateEnv(encoderEnv, 'encoder'), { missing: [], placeholders: [], unexpected: [], invalid: [] })
  const result = validateEnv({ ...encoderEnv, NEXTAUTH_SECRET: 'leaked', REDIS_URL: 'not-a-url' }, 'encoder')
  assert.deepEqual(result.unexpected, ['NEXTAUTH_SECRET'])
  assert.match(result.invalid.join(' '), /REDIS_URL/)
})

test('validateComposeConfig requires the migrated app and isolated encoder wiring', () => {
  const compose = `
services:
  portfolio:
    image: \${PORTFOLIO_APP_IMAGE:?Reviewed application image required}
    env_file:
      - \${PORTFOLIO_EXISTING_ENV_FILE:?Existing private application environment required}
      - \${PORTFOLIO_DATABASE_ENV_FILE:?Private PostgreSQL app environment required}
    environment:
      SKIP_DB_DURING_BUILD: "false"
      SKIP_REDIS_DURING_BUILD: "false"
  artifacts-encoder:
    image: \${PORTFOLIO_APP_IMAGE:?Reviewed application image required}
    command: ["node", "scripts/artifacts-encoder.mjs"]
    env_file:
      - \${PORTFOLIO_ENCODER_ENV_FILE:?Private encoder environment required}
    volumes:
      - artifacts_encoder_tmp:/tmp
`
  assert.deepEqual(validateComposeConfig(compose), [])
  assert.match(validateComposeConfig(compose.replace('PORTFOLIO_ENCODER_ENV_FILE', 'WRONG'))[0], /encoder/i)
})

test('validateNginxPatch checks origins, upload limits, encoder-facing API timeouts, and content write denial', () => {
  const patch = `
+    # artifacts.inakilozano.com -> portfolio app (3003)
+        client_max_body_size 20m;
+            proxy_request_buffering off;
+            proxy_read_timeout 300s;
+        location = /mcp { proxy_pass http://127.0.0.1:3003; }
+            proxy_pass http://127.0.0.1:3003;
+            limit_except GET HEAD { deny all; }
`
  assert.deepEqual(validateNginxPatch(patch), [])
  assert.match(validateNginxPatch(patch.replace('20m', '1m'))[0], /body/i)
})

test('validateMigrationFiles requires idempotent base-before-artifacts migration evidence', () => {
  const schema = `
    CREATE SCHEMA IF NOT EXISTS artifacts;
    CREATE TABLE IF NOT EXISTS artifacts.settings (key text);
    CREATE TABLE IF NOT EXISTS artifacts.artifacts (id bigint);
    ALTER TABLE artifacts.api_tokens ADD COLUMN IF NOT EXISTS limited boolean;
    ALTER TABLE artifacts.artifacts ADD COLUMN IF NOT EXISTS created_by_token bigint;
    ALTER TABLE artifacts.uploads ADD COLUMN IF NOT EXISTS sha256 text;
    ALTER TABLE artifacts.uploads ADD COLUMN IF NOT EXISTS consumed_at timestamptz;
    ALTER TABLE artifacts.uploads ADD COLUMN IF NOT EXISTS upload_scope text;
  `
  const script = "const { pool } = require('../lib/postgres-store'); const sql = fs.readFileSync(path.join(__dirname, '../lib/artifacts/schema.sql'), 'utf8'); pool().query(sql)"
  const result = validateMigrationFiles({ schema, script, releaseChecklist: 'npm run db:migrate\nnpm run db:migrate:artifacts\nnpm run check:artifacts:deployment' })
  assert.deepEqual(result, [])
  assert.match(validateMigrationFiles({ schema, script, releaseChecklist: 'npm run db:migrate:artifacts' })[0], /order/i)
})

test('validateMigrationFiles rejects an artifacts schema that only creates new tables', () => {
  const schema = 'CREATE SCHEMA IF NOT EXISTS artifacts; CREATE TABLE IF NOT EXISTS artifacts.settings (key text); CREATE TABLE IF NOT EXISTS artifacts.artifacts (id bigint);'
  const script = "const sql = fs.readFileSync('lib/artifacts/schema.sql', 'utf8'); pool().query(sql)"
  const issues = validateMigrationFiles({ schema, script, releaseChecklist: 'npm run db:migrate\nnpm run db:migrate:artifacts\nnpm run check:artifacts:deployment' })
  assert.equal(issues.length, 5)
  assert.match(issues.join(' '), /forward migration/)
})

test('checkArtifactsDatabase verifies both schemas and required artifact tables', async () => {
  const queries = []
  const pool = { query: async (sql) => { queries.push(sql); return { rows: [{ missing: 0 }] } } }
  await checkArtifactsDatabase(pool)
  assert.equal(queries.length, 1)
  assert.match(queries[0], /portfolio\.admins/)
  assert.match(queries[0], /artifacts\.artifacts/)
  await assert.rejects(() => checkArtifactsDatabase({ query: async () => ({ rows: [{ missing: 1 }] }) }), /migration/i)
})

test('the operational CLI fails closed for incomplete env files without echoing values', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-deployment-check-'))
  const file = path.join(dir, 'encoder.env')
  fs.writeFileSync(file, `DATABASE_URL=${encoderEnv.DATABASE_URL}\nREDIS_URL=${encoderEnv.REDIS_URL}\nARTIFACTS_S3_ENDPOINT=${encoderEnv.ARTIFACTS_S3_ENDPOINT}\nARTIFACTS_S3_BUCKET=artifacts\nARTIFACTS_S3_ACCESS_KEY=access\nARTIFACTS_S3_SECRET_KEY=super-secret-that-must-not-print\n`)
  await assert.rejects(
    () => run(process.execPath, ['scripts/artifacts-deployment-check.mjs', '--role', 'app', '--env-file', file, '--no-static'], { cwd: path.resolve(import.meta.dirname, '../..') }),
    (error) => error.code === 1 && /missing NEXTAUTH_SECRET/.test(error.stderr) && !error.stderr.includes('super-secret-that-must-not-print'),
  )
  fs.rmSync(dir, { recursive: true, force: true })
})
