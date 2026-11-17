#!/usr/bin/env node
// Deployment guardrails for the migrated artifacts stack. This command validates names and wiring only;
// it never prints secret values. Use --role app|encoder inside the corresponding container or env-file check.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const APP_REQUIRED_ENV = [
  'DATABASE_URL', 'REDIS_URL', 'NEXTAUTH_URL', 'NEXTAUTH_SECRET',
  'SMTP_SERVER', 'SMTP_PORT', 'SMTP_ENCRYPT', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'CONTACT_MAIL_FROM',
  'ARTIFACTS_APP_ORIGIN', 'ARTIFACTS_CONTENT_ORIGIN',
  'ARTIFACTS_S3_ENDPOINT', 'ARTIFACTS_S3_BUCKET', 'ARTIFACTS_S3_ACCESS_KEY', 'ARTIFACTS_S3_SECRET_KEY',
]

export const ENCODER_REQUIRED_ENV = [
  'DATABASE_URL', 'REDIS_URL', 'ARTIFACTS_S3_ENDPOINT', 'ARTIFACTS_S3_BUCKET',
  'ARTIFACTS_S3_ACCESS_KEY', 'ARTIFACTS_S3_SECRET_KEY',
]

export const ENCODER_ALLOWED_ENV = new Set([...ENCODER_REQUIRED_ENV, 'ARTIFACTS_ENCODER_TMP'])

const PLACEHOLDER = /^(?:your(?:[-_].*)?|change(?:[-_ ]?me)?|replace(?:[-_ ].*)?|todo|changeme|<.*>)$/i
const URL_ENV = new Set(['DATABASE_URL', 'REDIS_URL', 'ARTIFACTS_S3_ENDPOINT', 'NEXTAUTH_URL', 'ARTIFACTS_APP_ORIGIN', 'ARTIFACTS_CONTENT_ORIGIN'])
const ORIGIN_ENV = new Set(['NEXTAUTH_URL', 'ARTIFACTS_APP_ORIGIN', 'ARTIFACTS_CONTENT_ORIGIN'])
const SECRET_ENV = new Set(['NEXTAUTH_SECRET', 'SMTP_PASSWORD', 'ARTIFACTS_S3_SECRET_KEY'])

export function parseEnvFile(text) {
  const values = {}
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    values[match[1]] = value
  }
  return values
}

function invalidValue(name, value) {
  if (!value) return false
  if (URL_ENV.has(name)) {
    try {
      const url = new URL(value)
      if (!['http:', 'https:', 'postgres:', 'postgresql:', 'redis:', 'rediss:'].includes(url.protocol)) return true
      if (ORIGIN_ENV.has(name) && (url.pathname !== '/' && url.pathname !== '') || ORIGIN_ENV.has(name) && url.search || ORIGIN_ENV.has(name) && url.hash) return true
      if (ORIGIN_ENV.has(name) && !['http:', 'https:'].includes(url.protocol)) return true
    } catch { return true }
  }
  if (name === 'SMTP_PORT' && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535)) return true
  if (name === 'SMTP_ENCRYPT' && !/^(?:NONE|STARTTLS|SSL|TLS)$/i.test(value)) return true
  return false
}

export function validateEnv(env, role, { allowUnknown = false } = {}) {
  const required = role === 'encoder' ? ENCODER_REQUIRED_ENV : APP_REQUIRED_ENV
  const missing = required.filter((name) => !String(env?.[name] ?? '').trim())
  const placeholders = required.filter((name) => {
    const value = String(env?.[name] ?? '').trim()
    return !!value && (PLACEHOLDER.test(value) || (SECRET_ENV.has(name) && /^(?:secret|password|password123|test-secret)$/i.test(value)))
  })
  const unexpected = role === 'encoder' && !allowUnknown
    ? Object.keys(env || {}).filter((name) => name && !name.startsWith('_') && !ENCODER_ALLOWED_ENV.has(name)).sort()
    : []
  const invalid = required.filter((name) => !missing.includes(name) && invalidValue(name, String(env[name]).trim()))
  return { missing, placeholders, unexpected, invalid }
}

export function envIssues(env, role, options) {
  const result = validateEnv(env, role, options)
  return errorsForEnv(result, role)
}

export function assertValidEnv(env, role, options) {
  const issues = envIssues(env, role, options)
  if (issues.length) throw new Error(issues.join('; '))
  return true
}

export function validateComposeConfig(text) {
  const source = String(text)
  const checks = [
    [/image:\s*\$\{PORTFOLIO_APP_IMAGE:\?/, 'application image is required'],
    [/PORTFOLIO_EXISTING_ENV_FILE:\?/, 'existing application env file is required'],
    [/PORTFOLIO_DATABASE_ENV_FILE:\?/, 'PostgreSQL env file is required'],
    [/SKIP_DB_DURING_BUILD:\s*["']?false/, 'runtime database checks must be enabled'],
    [/SKIP_REDIS_DURING_BUILD:\s*["']?false/, 'runtime Redis checks must be enabled'],
    [/artifacts-encoder:[\s\S]*?command:\s*\[\s*["']node["']\s*,\s*["']scripts\/artifacts-encoder\.mjs["']\s*\]/, 'encoder must run the reviewed worker'],
    [/PORTFOLIO_ENCODER_ENV_FILE:\?/, 'encoder env file is required'],
    [/artifacts-encoder:[\s\S]*?volumes:[\s\S]*?artifacts_encoder_tmp:\/tmp/, 'encoder scratch volume is required'],
  ]
  return checks.filter(([pattern]) => !pattern.test(source)).map(([, message]) => message)
}

export function validateNginxPatch(text) {
  const source = String(text).split(/\r?\n/).filter((line) => !line.startsWith('-') || line.startsWith('---')).join('\n')
  const checks = [
    [/3003/g, 'both origins must proxy to the migrated app on port 3003'],
    [/client_max_body_size\s+20m\s*;/, 'request body limit must allow the 16 MiB part plus request overhead'],
    [/proxy_request_buffering\s+off\s*;/, 'upload parts must stream without proxy buffering'],
    [/proxy_read_timeout\s+300s\s*;/, 'upload parts need the slow-upload timeout'],
    [/location\s*=\s*\/mcp/, 'the MCP endpoint must be routed'],
    [/limit_except\s+GET\s+HEAD\s*\{\s*deny\s+all\s*;/, 'content origin must remain read-only'],
    [/proxy_pass\s+http:\/\/127\.0\.0\.1:3003\s*;/, 'artifacts traffic must reach the migrated app'],
  ]
  const issues = checks.filter(([pattern]) => !pattern.test(source)).map(([, message]) => message)
  if (/3480/.test(source)) issues.push('the retired artifacts upstream 3480 must not remain')
  return issues
}

export function validateMigrationFiles({ schema, script, releaseChecklist }) {
  const issues = []
  if (!/CREATE SCHEMA IF NOT EXISTS artifacts/i.test(schema) || !/CREATE TABLE IF NOT EXISTS artifacts\.settings/i.test(schema) || !/CREATE TABLE IF NOT EXISTS artifacts\.artifacts/i.test(schema)) {
    issues.push('artifacts schema must create its schema and core tables idempotently')
  }
  const forwardColumns = [
    [/ALTER TABLE artifacts\.api_tokens[\s\S]*ADD COLUMN IF NOT EXISTS limited/i, 'api token limited column must have a forward migration'],
    [/ALTER TABLE artifacts\.artifacts[\s\S]*ADD COLUMN IF NOT EXISTS created_by_token/i, 'artifact creator token column must have a forward migration'],
    [/ALTER TABLE artifacts\.uploads[\s\S]*ADD COLUMN IF NOT EXISTS sha256/i, 'upload sha256 column must have a forward migration'],
    [/ALTER TABLE artifacts\.uploads[\s\S]*ADD COLUMN IF NOT EXISTS consumed_at/i, 'upload consumed_at column must have a forward migration'],
    [/ALTER TABLE artifacts\.uploads[\s\S]*ADD COLUMN IF NOT EXISTS upload_scope/i, 'upload scope column must have a forward migration'],
  ]
  for (const [pattern, message] of forwardColumns) if (!pattern.test(schema)) issues.push(message)
  if (!/schema\.sql/.test(script) || !/pool\(\)\.query/.test(script)) issues.push('artifact migration must execute the checked-in schema through the PostgreSQL pool')
  const checklist = String(releaseChecklist)
  const commandIndex = (command) => checklist.search(new RegExp(`^\\s*${command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm'))
  const base = commandIndex('npm run db:migrate')
  const artifacts = commandIndex('npm run db:migrate:artifacts')
  const check = commandIndex('npm run check:artifacts:deployment')
  if (base < 0 || artifacts < 0 || check < 0 || base > artifacts) issues.push('release migration order must be base schema, artifacts schema, then deployment check')
  return issues
}

export async function checkArtifactsDatabase(pool) {
  const { rows } = await pool.query(`
    SELECT count(*) FILTER (WHERE to_regclass('portfolio.admins') IS NULL) AS missing_base,
           count(*) FILTER (WHERE to_regclass('artifacts.settings') IS NULL) AS missing_settings,
           count(*) FILTER (WHERE to_regclass('artifacts.artifacts') IS NULL) AS missing_artifacts,
           count(*) FILTER (WHERE to_regclass('artifacts.blobs') IS NULL) AS missing_blobs,
           count(*) FILTER (WHERE to_regclass('artifacts.files') IS NULL) AS missing_files,
           count(*) FILTER (WHERE to_regclass('artifacts.sessions') IS NULL) AS missing_sessions`)
  const row = rows?.[0] || {}
  if (Object.values(row).some((value) => Number(value) > 0)) throw new Error('artifacts migration is incomplete')
  return true
}

function errorsForEnv(result, role) {
  return [
    ...result.missing.map((name) => `${role}: missing ${name}`),
    ...result.placeholders.map((name) => `${role}: placeholder value for ${name}`),
    ...result.unexpected.map((name) => `${role}: unexpected variable ${name}`),
    ...result.invalid.map((name) => `${role}: invalid value for ${name}`),
  ]
}

function readRequired(file) {
  if (!file) throw new Error('env file path is required')
  return parseEnvFile(fs.readFileSync(file, 'utf8'))
}

export async function runChecks(options = {}) {
  const root = options.root || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const issues = []
  if (options.role) issues.push(...envIssues(options.env || process.env, options.role, { allowUnknown: !options.env }))
  if (options.appEnvFile) issues.push(...errorsForEnv(validateEnv(readRequired(options.appEnvFile), 'app'), 'app'))
  if (options.encoderEnvFile) issues.push(...errorsForEnv(validateEnv(readRequired(options.encoderEnvFile), 'encoder'), 'encoder'))
  if (options.static !== false) {
    issues.push(...validateComposeConfig(fs.readFileSync(options.compose || path.join(root, 'compose.postgres-app.yml'), 'utf8')))
    issues.push(...validateNginxPatch(fs.readFileSync(options.nginxPatch || path.join(root, 'docs/artifacts-nginx.patch'), 'utf8')))
    issues.push(...validateMigrationFiles({
      schema: fs.readFileSync(path.join(root, 'lib/artifacts/schema.sql'), 'utf8'),
      script: fs.readFileSync(path.join(root, 'scripts/artifacts-schema.cjs'), 'utf8'),
      releaseChecklist: fs.readFileSync(options.releaseChecklist || path.join(root, 'docs/artifacts-release-checklist.md'), 'utf8'),
    }))
  }
  if (options.checkDatabase) {
    const { Pool } = await import('pg')
    const pool = new Pool({ connectionString: (options.env || process.env).DATABASE_URL, max: 1, connectionTimeoutMillis: 10000 })
    try { await checkArtifactsDatabase(pool) } finally { await pool.end() }
  }
  return issues
}

async function main(argv) {
  const options = { static: true }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--role') options.role = argv[++i]
    else if (arg === '--env-file') options.env = readRequired(argv[++i])
    else if (arg === '--app-env') options.appEnvFile = argv[++i]
    else if (arg === '--encoder-env') options.encoderEnvFile = argv[++i]
    else if (arg === '--compose') options.compose = argv[++i]
    else if (arg === '--nginx-patch') options.nginxPatch = argv[++i]
    else if (arg === '--release-checklist') options.releaseChecklist = argv[++i]
    else if (arg === '--no-static') options.static = false
    else if (arg === '--check-db') options.checkDatabase = true
    else throw new Error(`unknown argument: ${arg}`)
  }
  if (options.role && !['app', 'encoder'].includes(options.role)) throw new Error('--role must be app or encoder')
  const issues = await runChecks(options)
  if (issues.length) {
    for (const issue of issues) console.error(`FAIL: ${issue}`)
    process.exitCode = 1
    return
  }
  console.log('PASS: artifacts deployment checks')
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main(process.argv.slice(2)).catch((error) => {
  console.error(`FAIL: ${error.message}`)
  process.exitCode = 1
})
