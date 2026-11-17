import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import pg from 'pg'

const databaseUrl = process.env.ARTIFACTS_MIGRATION_TEST_DATABASE_URL
const root = path.resolve(import.meta.dirname, '../..')
const currentSchema = fs.readFileSync(path.join(root, 'lib/artifacts/schema.sql'), 'utf8')
const historicalSchema = `
CREATE SCHEMA artifacts;

CREATE TABLE artifacts.api_tokens (
  id bigserial PRIMARY KEY, name text NOT NULL, token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz, revoked_at timestamptz);

CREATE TABLE artifacts.artifacts (
  id bigserial PRIMARY KEY, slug text NOT NULL UNIQUE, title text NOT NULL,
  current_version integer NOT NULL DEFAULT 0, cap_epoch integer NOT NULL DEFAULT 0,
  access text NOT NULL DEFAULT 'restricted' CHECK (access IN ('restricted', 'link', 'password')),
  access_role text NOT NULL DEFAULT 'viewer' CHECK (access_role IN ('viewer', 'responder', 'editor')),
  password_hash text, password_epoch integer NOT NULL DEFAULT 0,
  responders text NOT NULL DEFAULT 'account' CHECK (responders IN ('anonymous', 'declared', 'account')),
  responses_open boolean NOT NULL DEFAULT true,
  feedback text NOT NULL DEFAULT 'none' CHECK (feedback IN ('none', 'score', 'answers')),
  notify_owner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE artifacts.uploads (
  id text PRIMARY KEY, artifact_id bigint NOT NULL REFERENCES artifacts.artifacts(id) ON DELETE CASCADE,
  path text NOT NULL, size bigint NOT NULL, content_type text NOT NULL, fingerprint text,
  object_key text NOT NULL, s3_upload_id text NOT NULL, part_size integer NOT NULL,
  parts jsonb NOT NULL DEFAULT '{}'::jsonb, completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL);
`

function inSchema(sql, schema) {
  return sql
    .replaceAll('CREATE SCHEMA IF NOT EXISTS artifacts', `CREATE SCHEMA IF NOT EXISTS ${schema}`)
    .replaceAll('CREATE SCHEMA artifacts', `CREATE SCHEMA ${schema}`)
    .replaceAll('artifacts.', `${schema}.`)
}

test('forward artifact migration adds legacy columns and is idempotent', { skip: !databaseUrl }, async () => {
  const { Client } = pg
  const client = new Client({ connectionString: databaseUrl })
  const schema = `artifacts_migration_${crypto.randomUUID().replaceAll('-', '')}`

  await client.connect()
  try {
    await client.query(inSchema(historicalSchema, schema))
    const token = await client.query(`INSERT INTO ${schema}.api_tokens(name, token_hash) VALUES ('legacy', 'legacy-hash') RETURNING id`)
    const artifact = await client.query(`INSERT INTO ${schema}.artifacts(slug, title) VALUES ('legacy', 'Legacy') RETURNING id`)
    await client.query(`INSERT INTO ${schema}.uploads(id, artifact_id, path, size, content_type, object_key, s3_upload_id, part_size, expires_at)
      VALUES ('legacy-upload', $1, 'index.html', 7, 'text/html', 'legacy-object', 'legacy-multipart', 16, now() + interval '1 hour')`, [artifact.rows[0].id])

    const migration = inSchema(currentSchema, schema)
    await client.query(migration)
    await client.query(migration)

    const columns = await client.query(`
      SELECT table_name, column_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = $1
        AND (table_name, column_name) IN (($2, $3), ($4, $5), ($6, $7), ($8, $9), ($10, $11))`, [
      schema, 'api_tokens', 'limited', 'artifacts', 'created_by_token', 'uploads', 'sha256', 'uploads', 'consumed_at', 'uploads', 'upload_scope',
    ])
    const byColumn = new Map(columns.rows.map((row) => [`${row.table_name}.${row.column_name}`, row]))
    assert.equal(byColumn.get('api_tokens.limited').is_nullable, 'NO')
    assert.match(byColumn.get('api_tokens.limited').column_default, /false/)
    assert.equal(byColumn.get('artifacts.created_by_token').is_nullable, 'YES')
    assert.equal(byColumn.get('uploads.sha256').is_nullable, 'YES')
    assert.equal(byColumn.get('uploads.consumed_at').is_nullable, 'YES')
    assert.equal(byColumn.get('uploads.upload_scope').is_nullable, 'NO')
    assert.match(byColumn.get('uploads.upload_scope').column_default, /owner/)

    const preserved = await client.query(`
      SELECT t.limited, a.created_by_token, u.sha256, u.consumed_at, u.upload_scope
      FROM ${schema}.api_tokens t
      JOIN ${schema}.artifacts a ON a.id = $1
      JOIN ${schema}.uploads u ON u.id = 'legacy-upload'
      WHERE t.id = $2`, [artifact.rows[0].id, token.rows[0].id])
    assert.deepEqual(preserved.rows[0], { limited: false, created_by_token: null, sha256: null, consumed_at: null, upload_scope: 'owner' })

    const indexes = await client.query(`SELECT indexname FROM pg_indexes WHERE schemaname = $1 AND indexname = ANY($2::text[])`, [
      schema, ['artifacts_created_by_token_idx', 'uploads_scope_open'],
    ])
    assert.deepEqual(new Set(indexes.rows.map((row) => row.indexname)), new Set(['artifacts_created_by_token_idx', 'uploads_scope_open']))
  } finally {
    await client.query(`DROP SCHEMA ${schema} CASCADE`)
    await client.end()
  }
})
