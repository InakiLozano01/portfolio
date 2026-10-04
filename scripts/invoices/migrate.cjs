// Run explicitly with the existing migration-owner connection, never at startup.
const { Pool } = require('pg')
const fs = require('node:fs')
const path = require('node:path')
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required')
  const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
  try { await db.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')); console.log('Invoice schema ready') }
  finally { await db.end() }
}
main().catch(() => { console.error('Invoice migration failed; no credentials are logged'); process.exitCode = 1 })
