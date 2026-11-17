// Creates the artifacts tables (idempotent). Run with the owner role's DATABASE_URL, like db:migrate.
// With ARTIFACTS_APP_ROLE set, also grants that role what the app and encoder need (and nothing else).
const fs = require('node:fs')
const path = require('node:path')
const { escapeIdentifier } = require('pg')
const { pool } = require('../lib/postgres-store')
const sql = fs.readFileSync(path.join(__dirname, '../lib/artifacts/schema.sql'), 'utf8')

const role = process.env.ARTIFACTS_APP_ROLE

async function main() {
  await pool().query(sql)
  console.log('Artifacts schema ready')
  if (!role) return
  const r = escapeIdentifier(role)
  await pool().query(`GRANT USAGE ON SCHEMA artifacts TO ${r};
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA artifacts TO ${r};
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA artifacts TO ${r}`)
  console.log('Artifacts grants applied to the app role')
}

main().catch(error => {
  console.error('Artifacts schema failed', error.code || error.name, error.message)
  process.exitCode = 1
}).finally(() => pool().end())
