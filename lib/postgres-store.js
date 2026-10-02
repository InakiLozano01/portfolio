// BSON is authoritative. JSONB is an indexed search projection, not a lossy
// replacement for ObjectIds, dates, binary values or other recovered BSON types.
const { Pool } = require('pg')
const { serialize, deserialize, ObjectId, EJSON } = require('bson')
const COLLECTIONS = ['admins', 'blogs', 'comments', 'contacts', 'projects', 'sections', 'skills', 'subscribers']
let configuredPool
function pool() {
  if (configuredPool) return configuredPool
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
  const key = Symbol.for('portfolio.postgres.pool')
  globalThis[key] ||= new Pool({ connectionString: process.env.DATABASE_URL, max: 4, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000, statement_timeout: 15000, application_name: 'portfolio' })
  return globalThis[key]
}
function configurePool(value) { configuredPool = value }
function table(name) {
  if (!COLLECTIONS.includes(name)) throw new Error('Unsupported collection')
  return `portfolio.${name}`
}
function plain(value) {
  if (value == null) return value
  if (value instanceof Date) return value.toISOString()
  if (value._bsontype === 'ObjectId') return value.toHexString()
  if (value._bsontype === 'Long' || value._bsontype === 'Decimal128') return value.toString()
  if (value._bsontype || Buffer.isBuffer(value)) return EJSON.serialize(value)
  if (Array.isArray(value)) return value.map(plain)
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => [k, plain(v)]))
  return value
}
function pathParts(path) {
  const parts = path.split('.')
  if (parts.some(p => !p || p.startsWith('$') || ['__proto__', 'constructor', 'prototype'].includes(p))) throw new Error('Invalid document path')
  return parts
}
function getPath(doc, path) { return pathParts(path).reduce((o, k) => o?.[k], doc) }
function setPath(doc, path, value, remove = false) {
  const parts = pathParts(path)
  let target = doc
  for (const part of parts.slice(0, -1)) {
    if (remove && target[part] == null) return
    target = target[part] ||= {}
  }
  if (remove) delete target[parts.at(-1)]
  else target[parts.at(-1)] = value
}
function jsonEqual(a, b) { return JSON.stringify(plain(a)) === JSON.stringify(plain(b)) }
function compileFilter(filter = {}, values = []) {
  const param = value => { values.push(value); return `$${values.length}` }
  function equal(expr, value) {
    if (value === null) return `(${expr} IS NULL OR ${expr} = 'null'::jsonb)`
    const rhs = `${param(JSON.stringify(plain(value)))}::jsonb`
    return `(${expr} = ${rhs} OR (jsonb_typeof(${expr}) = 'array' AND ${expr} @> jsonb_build_array(${rhs})))`
  }
  function regex(expr, pattern, flags) {
    if (typeof pattern !== 'string' || /[^im]/.test(flags)) throw new Error('Unsupported regular expression')
    return `(${expr} #>> '{}') ${flags.includes('i') ? '~*' : '~'} ${param(flags.includes('m') ? `(?n)${pattern}` : pattern)}`
  }
  function condition(expr, value) {
    if (value instanceof RegExp) return regex(expr, value.source, value.flags)
    if (!value || typeof value !== 'object' || value instanceof Date || value._bsontype || Array.isArray(value)) return equal(expr, value)
    const entries = Object.entries(value)
    if (!entries.some(([k]) => k.startsWith('$'))) return equal(expr, value)
    return entries.filter(([op]) => op !== '$options').map(([op, operand]) => {
      if (op === '$eq') return equal(expr, operand)
      if (op === '$ne') return `NOT COALESCE(${equal(expr, operand)}, FALSE)`
      if (op === '$exists') return `${expr} IS ${operand ? 'NOT ' : ''}NULL`
      if (op === '$in' || op === '$nin') {
        if (!Array.isArray(operand)) throw new Error('Invalid membership filter')
        const match = operand.length ? `(${operand.map(v => condition(expr, v)).join(' OR ')})` : 'FALSE'
        return op === '$in' ? match : `NOT COALESCE(${match}, FALSE)`
      }
      if (op === '$regex') return regex(expr, operand instanceof RegExp ? operand.source : operand, value.$options || (operand instanceof RegExp ? operand.flags : ''))
      if (op === '$not') return `NOT COALESCE(${condition(expr, operand)}, FALSE)`
      const comparison = { $gt: '>', $gte: '>=', $lt: '<', $lte: '<=' }[op]
      if (comparison) {
        const rhs = `${param(JSON.stringify(plain(operand)))}::jsonb`
        return `(jsonb_typeof(${expr}) = jsonb_typeof(${rhs}) AND ${expr} ${comparison} ${rhs})`
      }
      throw new Error(`Unsupported filter operator: ${op}`)
    }).map(s => `(${s})`).join(' AND ') || 'TRUE'
  }
  function walk(doc) {
    return Object.entries(doc).map(([key, value]) => {
      if (key === '$or' || key === '$and') {
        if (!Array.isArray(value) || value.length === 0) throw new Error('Empty logical filter')
        return `(${value.map(walk).join(key === '$or' ? ' OR ' : ' AND ')})`
      }
      if (key.startsWith('$')) throw new Error(`Unsupported filter operator: ${key}`)
      return `(${condition(`document #> ${param(pathParts(key))}::text[]`, value)})`
    }).join(' AND ') || 'TRUE'
  }
  return { sql: walk(filter), values }
}
function project(doc, projection) {
  if (!doc || !projection || !Object.keys(projection).length) return doc
  const include = Object.entries(projection).filter(([k, v]) => k !== '_id' && v)
  if (include.length || projection._id === 1 && Object.keys(projection).length === 1) {
    const result = projection._id === 0 ? {} : { _id: doc._id }
    for (const [path] of include) { const value = getPath(doc, path); if (value !== undefined) setPath(result, path, value) }
    return result
  }
  for (const [path, included] of Object.entries(projection)) if (!included) setPath(doc, path, undefined, true)
  return doc
}
function applyUpdate(doc, update, inserting = false) {
  if (Object.keys(update).some(k => !k.startsWith('$'))) throw new Error('Replacement updates are not supported')
  for (const [op, fields] of Object.entries(update)) {
    if (op === '$setOnInsert' && !inserting) continue
    for (const [path, value] of Object.entries(fields)) {
      if (path === '_id' && !inserting) { if (!jsonEqual(doc._id, value)) throw new Error('Immutable _id'); continue }
      const previous = getPath(doc, path)
      if (op === '$set' || op === '$setOnInsert') setPath(doc, path, value)
      else if (op === '$unset') setPath(doc, path, undefined, true)
      else if (op === '$inc') {
        const numeric = previous?._bsontype === 'Int32' || previous?._bsontype === 'Double' ? previous.valueOf() : previous
        if (typeof value !== 'number' || numeric !== undefined && typeof numeric !== 'number') throw new Error('Invalid increment')
        setPath(doc, path, (numeric || 0) + value)
      } else if (op === '$push' || op === '$addToSet') {
        if (previous !== undefined && !Array.isArray(previous)) throw new Error('Expected array')
        const additions = value && typeof value === 'object' && '$each' in value ? value.$each : [value]
        if (value && typeof value === 'object' && Object.keys(value).some(k => k.startsWith('$') && k !== '$each')) throw new Error('Unsupported array modifier')
        if (!Array.isArray(additions)) throw new Error('Expected array')
        const next = [...(previous || [])]
        for (const v of additions) if (op === '$push' || !next.some(x => jsonEqual(x, v))) next.push(v)
        setPath(doc, path, next)
      } else if (op === '$pullAll' || op === '$pull') {
        const remove = op === '$pullAll' ? value : [value]
        if (!Array.isArray(remove) || remove.some(v => v && typeof v === 'object' && !v._bsontype)) throw new Error('Only scalar pull is supported')
        setPath(doc, path, (previous || []).filter(x => !remove.some(v => jsonEqual(x, v))))
      } else throw new Error(`Unsupported update operator: ${op}`)
    }
  }
  return doc
}
function translateError(error) {
  if (error.code === '23505') { const duplicate = new Error('Duplicate document or unique field'); duplicate.code = 11000; return duplicate }
  return error
}
async function transaction(fn, connection = pool()) {
  const client = await connection.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) { await client.query('ROLLBACK'); throw translateError(error) }
  finally { client.release() }
}
function collection(name) {
  const target = table(name)
  async function read(filter, options = {}, client = pool(), lock = false) {
    const compiled = compileFilter(filter)
    let sql = `SELECT id, bson FROM ${target} WHERE ${compiled.sql}`
    if (options.sort) {
      sql += ' ORDER BY ' + Object.entries(options.sort).map(([path, direction]) => {
        compiled.values.push(pathParts(path))
        return `document #> $${compiled.values.length}::text[] ${direction === -1 ? 'DESC NULLS LAST' : 'ASC NULLS FIRST'}`
      }).join(', ') + ', id ASC'
    } else sql += ' ORDER BY id ASC'
    if (options.limit) { compiled.values.push(Math.abs(options.limit)); sql += ` LIMIT $${compiled.values.length}` }
    if (options.skip) { compiled.values.push(options.skip); sql += ` OFFSET $${compiled.values.length}` }
    if (lock) sql += ' FOR UPDATE'
    return (await client.query(sql, compiled.values)).rows.map(row => ({ id: row.id, bson: Buffer.from(row.bson), doc: deserialize(Buffer.from(row.bson)) }))
  }
  async function insert(doc, client = pool()) {
    doc._id ||= new ObjectId()
    try { await client.query(`INSERT INTO ${target} (id, document, bson) VALUES ($1, $2::jsonb, $3)`, [String(doc._id), JSON.stringify(plain(doc)), serialize(doc)]) }
    catch (error) { throw translateError(error) }
    return { acknowledged: true, insertedId: doc._id }
  }
  async function update(filter, patch, options = {}, many = false) {
    return transaction(async client => {
      const rows = await read(filter, { ...options, projection: undefined, limit: many ? undefined : 1 }, client, true)
      if (!rows.length && options.upsert) {
        const base = Object.fromEntries(Object.entries(filter).filter(([key, value]) => !key.startsWith('$') && !(value && typeof value === 'object' && !value._bsontype)))
        const doc = applyUpdate(base, patch, true)
        const result = await insert(doc, client)
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: result.insertedId, before: null, after: doc }
      }
      let modifiedCount = 0, before = null, after = null
      for (const row of rows) {
        const original = row.bson
        before ||= deserialize(original)
        // Preserve unmodified BSON numeric types even when replacing other fields.
        const doc = applyUpdate(deserialize(original, { promoteValues: false }), patch)
        const bson = serialize(doc)
        if (!bson.equals(original)) {
          await client.query(`UPDATE ${target} SET document = $2::jsonb, bson = $3, revision = revision + 1 WHERE id = $1`, [row.id, JSON.stringify(plain(doc)), bson])
          modifiedCount++
        }
        after = deserialize(bson)
      }
      return { acknowledged: true, matchedCount: rows.length, modifiedCount, upsertedCount: 0, upsertedId: null, before, after }
    })
  }
  async function remove(filter, many, options = {}) {
    return transaction(async client => {
      const rows = await read(filter, { ...options, limit: many ? undefined : 1 }, client, true)
      if (rows.length) await client.query(`DELETE FROM ${target} WHERE id = ANY($1::text[])`, [rows.map(r => r.id)])
      return { acknowledged: true, deletedCount: rows.length, value: rows[0]?.doc || null }
    })
  }
  return {
    find(filter = {}, options = {}) {
      const cursor = {
        async toArray() { return (await read(filter, options)).map(r => project(r.doc, options.projection)) },
        sort(value) { options.sort = value; return cursor }, limit(value) { options.limit = value; return cursor },
        skip(value) { options.skip = value; return cursor }, project(value) { options.projection = value; return cursor },
        async *[Symbol.asyncIterator]() { for (const doc of await cursor.toArray()) yield doc },
      }
      return cursor
    },
    async findOne(filter = {}, options = {}) { const rows = await read(filter, { ...options, limit: 1 }); return rows.length ? project(rows[0].doc, options.projection) : null },
    insertOne: (doc, _options) => insert(doc),
    async insertMany(docs) {
      return transaction(async client => { const insertedIds = {}; for (let i = 0; i < docs.length; i++) insertedIds[i] = (await insert(docs[i], client)).insertedId; return { acknowledged: true, insertedCount: docs.length, insertedIds } })
    },
    updateOne: (filter, patch, options) => update(filter, patch, options),
    updateMany: (filter, patch, options) => update(filter, patch, options, true),
    async findOneAndUpdate(filter, patch, options = {}) {
      const result = await update(filter, patch, options)
      const value = project(options.returnDocument === 'after' ? result.after : result.before, options.projection)
      return options.includeResultMetadata ? { value, ok: 1, lastErrorObject: { updatedExisting: result.matchedCount > 0 } } : value
    },
    deleteOne: filter => remove(filter, false), deleteMany: filter => remove(filter, true),
    async findOneAndDelete(filter, options = {}) { const result = await remove(filter, false, options); const value = project(result.value, options.projection); return options.includeResultMetadata ? { value, ok: 1 } : value },
    async countDocuments(filter = {}) { const compiled = compileFilter(filter); return (await pool().query(`SELECT count(*)::integer AS count FROM ${target} WHERE ${compiled.sql}`, compiled.values)).rows[0].count },
  }
}
async function migrateSchema(connection = pool()) {
  return transaction(async client => {
    await client.query('CREATE SCHEMA IF NOT EXISTS portfolio')
    await client.query('SELECT pg_advisory_xact_lock(721489210)')
    for (const name of COLLECTIONS) {
      await client.query(`CREATE TABLE IF NOT EXISTS ${table(name)} (id text PRIMARY KEY, document jsonb NOT NULL, bson bytea NOT NULL, revision bigint NOT NULL DEFAULT 0, CHECK (id = document->>'_id'))`)
      await client.query(`CREATE INDEX IF NOT EXISTS ${name}_document_gin ON ${table(name)} USING gin (document jsonb_path_ops)`)
    }
    for (const name of ['admins', 'subscribers']) await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS ${name}_email_unique ON ${table(name)} ((document->>'email'))`)
    await client.query("CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_unique ON portfolio.projects ((document->>'slug'))")
    for (const name of ['blogs', 'comments', 'contacts', 'projects', 'subscribers']) await client.query(`CREATE INDEX IF NOT EXISTS ${name}_created_at ON ${table(name)} ((document->'createdAt'))`)
    for (const [name, field] of [['blogs', 'slug'], ['comments', 'blog'], ['comments', 'parent'], ['subscribers', 'token'], ['subscribers', 'confirmToken'], ['sections', 'order'], ['contacts', 'ipAddress']]) await client.query(`CREATE INDEX IF NOT EXISTS ${name}_${field.toLowerCase()} ON ${table(name)} ((document->'${field}'))`)
    await client.query('CREATE TABLE IF NOT EXISTS portfolio.migration_runs (source_sha256 text PRIMARY KEY, source_manifest jsonb NOT NULL, completed_at timestamptz NOT NULL DEFAULT now(), counts jsonb NOT NULL)')
    await client.query('CREATE TABLE IF NOT EXISTS portfolio.legacy_documents (collection text NOT NULL, source_id text NOT NULL, bson bytea NOT NULL, PRIMARY KEY (collection, source_id))')
  }, connection)
}
module.exports = { COLLECTIONS, pool, configurePool, table, plain, compileFilter, applyUpdate, collection, migrateSchema, transaction }
