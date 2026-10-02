const { migrateSchema, pool } = require('../lib/postgres-store')
migrateSchema().then(() => console.log('PostgreSQL schema ready')).catch(error => {
  console.error('Schema migration failed', error.code || error.name)
  process.exitCode = 1
}).finally(() => pool().end())
