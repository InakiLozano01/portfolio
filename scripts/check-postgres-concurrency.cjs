// Run with the migration owner against PostgreSQL. All writes use a disposable
// schema created by this process; application tables are never touched.
const assert = require('node:assert/strict')
const { Pool } = require('pg')
const { ObjectId } = require('bson')
const store = require('../lib/postgres-store')
const schema = `portfolio_check_${Date.now()}_${process.pid}`
const raw = new Pool({ connectionString: process.env.DATABASE_URL, max: 4, statement_timeout: 15000 })
const rewrite = sql => sql.replace(/\bportfolio\b/g, schema)
const wrapped = {
  query: (sql, args) => raw.query(rewrite(sql), args),
  async connect() {
    const client = await raw.connect()
    return { query: (sql, args) => client.query(rewrite(sql), args), release: () => client.release() }
  },
}
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required')
  await raw.query(`CREATE SCHEMA ${schema}`)
  try {
    store.configurePool(wrapped)
    await store.migrateSchema(wrapped)
    const skills = store.collection('skills')
    const id = new ObjectId()
    await skills.insertOne({ _id: id, count: 0, __v: 0 })
    await Promise.all(Array.from({ length: 4 }, async () => {
      for (let i = 0; i < 20; i++) await skills.updateOne({ _id: id }, { $inc: { count: 1 } })
    }))
    assert.equal((await skills.findOne({ _id: id })).count, 80)
    const stale = await Promise.all(Array.from({ length: 2 }, () => skills.updateOne({ _id: id, __v: 0 }, { $inc: { __v: 1 } })))
    assert.equal(stale.reduce((n, r) => n + r.modifiedCount, 0), 1)
    const duplicates = await Promise.allSettled(Array.from({ length: 2 }, () => store.collection('admins').insertOne({ _id: new ObjectId(), email: 'synthetic@example.invalid' })))
    assert.equal(duplicates.filter(r => r.status === 'fulfilled').length, 1)
    assert.equal(duplicates.find(r => r.status === 'rejected').reason.code, 11000)
    console.log(JSON.stringify({ concurrentIncrements: 80, staleWriteWinners: 1, duplicateInsertWinners: 1, passed: true }))
  } finally {
    await raw.query(`DROP SCHEMA ${schema} CASCADE`)
  }
}
main().catch(error => { console.error(JSON.stringify({ failed: true, code: error.code || error.name })); process.exitCode = 1 }).finally(() => raw.end())
