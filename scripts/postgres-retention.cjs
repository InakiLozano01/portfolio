const { Pool } = require('pg')
const { configurePool, collection } = require('../lib/postgres-store')
const connection = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10000, statement_timeout: 15000 })
configurePool(connection)
let running = false
async function sweep() {
  if (running) return
  running = true
  try {
    const result = await collection('contacts').deleteMany({ createdAt: { $lt: new Date(Date.now() - 30 * 86400000) } })
    if (result.deletedCount) console.log('Expired contact records:', result.deletedCount)
  } catch (error) { console.error('Contact retention failed:', error.code || error.name) }
  finally { running = false }
}
if (process.argv.includes('--once')) sweep().finally(() => connection.end())
else {
  const timer = setInterval(sweep, 60000)
  sweep()
  const stop = () => { clearInterval(timer); connection.end().finally(() => process.exit()) }
  process.once('SIGTERM', stop)
  process.once('SIGINT', stop)
}
