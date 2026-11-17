// Creates the artifacts tables (idempotent). Run with the owner role's DATABASE_URL, like db:migrate.
const fs = require('node:fs')
const path = require('node:path')
const { pool } = require('../lib/postgres-store')
const sql = fs.readFileSync(path.join(__dirname, '../lib/artifacts/schema.sql'), 'utf8')
pool().query(sql).then(() => console.log('Artifacts schema ready')).catch(error => {
  console.error('Artifacts schema failed', error.code || error.name, error.message)
  process.exitCode = 1
}).finally(() => pool().end())
