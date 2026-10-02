// Imports a checked BSON snapshot into an empty PostgreSQL schema atomically.
// It never invokes Mongoose save hooks: existing admin hashes remain unchanged.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { deserialize, EJSON } = require('bson')
const { escapeLiteral } = require('pg')
const store = require('../lib/postgres-store')

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex') }
function readExport(directory) {
  const bytes = fs.readFileSync(path.join(directory, 'manifest.json'))
  const manifest = EJSON.parse(bytes.toString('utf8'))
  if (manifest.format !== 1 || !/^[a-f0-9]{64}$/.test(manifest.sourceArchiveSha256)) throw new Error('Invalid source manifest')
  const collections = []
  const seen = new Set()
  for (const entry of manifest.collections) {
    if (!/^[A-Za-z0-9_.-]+$/.test(entry.name) || seen.has(entry.name) || entry.file !== `${entry.name}.bson`) throw new Error('Invalid or duplicate collection')
    seen.add(entry.name)
    const content = fs.readFileSync(path.join(directory, entry.file))
    if (sha256(content) !== entry.sha256) throw new Error(`Checksum mismatch: ${entry.name}`)
    const docs = []; let offset = 0
    while (offset < content.length) {
      if (offset + 4 > content.length) throw new Error('Truncated BSON')
      const size = content.readInt32LE(offset)
      if (size < 5 || size > 16 * 1024 * 1024 || offset + size > content.length) throw new Error('Invalid BSON size')
      const bson = content.subarray(offset, offset + size)
      const document = deserialize(bson)
      if (document._id === undefined) throw new Error('Document has no identity')
      docs.push({ bson, document }); offset += size
    }
    if (docs.length !== entry.count) throw new Error(`Count mismatch: ${entry.name}`)
    collections.push({ ...entry, docs })
  }
  for (const name of store.COLLECTIONS) if (!seen.has(name)) throw new Error(`Expected collection absent: ${name}`)
  return { manifest, manifestSha256: sha256(bytes), collections }
}

async function installSourceUniqueIndexes(client, source) {
  for (const col of source.collections) {
    if (!store.COLLECTIONS.includes(col.name)) continue
    for (const index of col.indexes || []) {
      if (!index.unique || Object.keys(index.key).join() === '_id') continue
      if (index.partialFilterExpression || index.collation && index.collation.locale !== 'simple') throw new Error(`Unsupported unique index semantics: ${col.name}`)
      const keys = Object.entries(index.key)
      if (keys.some(([, order]) => order !== 1 && order !== -1)) throw new Error('Unsupported unique index type')
      const expressions = keys.map(([field]) => {
        const parts = field.split('.')
        if (parts.some(p => !p || p.startsWith('$'))) throw new Error('Invalid index field')
        return `document #> ARRAY[${parts.map(escapeLiteral).join(',')}]::text[]`
      })
      const name = `source_unique_${sha256(Buffer.from(col.name + JSON.stringify(index.key))).slice(0, 20)}`
      const where = index.sparse ? ` WHERE (${expressions.map(e => `${e} IS NOT NULL`).join(' OR ')})` : ''
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS ${name} ON ${store.table(col.name)} (${expressions.map(e => `(COALESCE(${e}, 'null'::jsonb))`).join(',')})${where}`)
    }
  }
}

async function compareSnapshot(client, source) {
  const counts = {}
  for (const col of source.collections) {
    let rows
    if (store.COLLECTIONS.includes(col.name)) rows = (await client.query(`SELECT id, bson FROM ${store.table(col.name)} ORDER BY id`)).rows
    else rows = (await client.query('SELECT source_id AS id, bson FROM portfolio.legacy_documents WHERE collection=$1 ORDER BY source_id', [col.name])).rows
    const expected = new Map(col.docs.map(d => [store.COLLECTIONS.includes(col.name) ? String(d.document._id) : EJSON.stringify(d.document._id, { relaxed: false }), d.bson]))
    if (rows.length !== col.count) throw new Error(`Target count mismatch: ${col.name}`)
    for (const row of rows) if (!expected.get(row.id)?.equals(Buffer.from(row.bson))) throw new Error(`Target BSON differs: ${col.name}`)
    counts[col.name] = rows.length
  }
  return counts
}

function relationshipReport(source) {
  const byName = Object.fromEntries(source.collections.map(c => [c.name, c.docs.map(d => d.document)]))
  const ids = name => new Set(byName[name].map(d => String(d._id)))
  const skills = ids('skills'), blogs = ids('blogs'), comments = ids('comments')
  return {
    missingProjectSkills: byName.projects.reduce((n, d) => n + (d.technologies || []).filter(id => !skills.has(String(id))).length, 0),
    missingCommentBlogs: byName.comments.filter(d => !blogs.has(String(d.blog))).length,
    missingCommentParents: byName.comments.filter(d => d.parent && !comments.has(String(d.parent))).length,
    adminHashCount: byName.admins.filter(d => typeof d.password === 'string' && /^\$2[aby]\$/.test(d.password)).length,
  }
}

async function importExport(directory) {
  const source = readExport(directory)
  const relationships = relationshipReport(source)
  await store.migrateSchema()
  return store.transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(721489211)')
    const existing = await client.query('SELECT source_sha256 FROM portfolio.migration_runs')
    if (existing.rows.length) {
      if (existing.rows.length !== 1 || existing.rows[0].source_sha256 !== source.manifestSha256) throw new Error('Destination belongs to a different migration')
      return { alreadyImported: true, counts: await compareSnapshot(client, source), relationships }
    }
    for (const name of store.COLLECTIONS) {
      const count = (await client.query(`SELECT count(*)::integer AS count FROM ${store.table(name)}`)).rows[0].count
      if (count) throw new Error('Destination must be empty before first import')
    }
    if ((await client.query('SELECT count(*)::integer AS count FROM portfolio.legacy_documents')).rows[0].count) throw new Error('Legacy destination must be empty')
    await installSourceUniqueIndexes(client, source)
    for (const col of source.collections) for (const doc of col.docs) {
      if (store.COLLECTIONS.includes(col.name)) {
        await client.query(`INSERT INTO ${store.table(col.name)} (id, document, bson) VALUES ($1, $2::jsonb, $3)`, [String(doc.document._id), JSON.stringify(store.plain(doc.document)), doc.bson])
      } else await client.query('INSERT INTO portfolio.legacy_documents (collection, source_id, bson) VALUES ($1,$2,$3)', [col.name, EJSON.stringify(doc.document._id, { relaxed: false }), doc.bson])
    }
    const counts = await compareSnapshot(client, source)
    await client.query('INSERT INTO portfolio.migration_runs (source_sha256, source_manifest, counts) VALUES ($1,$2::jsonb,$3::jsonb)', [source.manifestSha256, JSON.stringify(store.plain(source.manifest)), JSON.stringify(counts)])
    return { alreadyImported: false, counts, relationships, manifestSha256: source.manifestSha256 }
  })
}

module.exports = { readExport, importExport, compareSnapshot, relationshipReport }
if (require.main === module) {
  const directory = process.argv[2]
  if (!directory) { console.error('Usage: node scripts/import-mongo-export.cjs PRIVATE_EXPORT_DIRECTORY'); process.exitCode = 1 }
  else importExport(directory).then(result => console.log(JSON.stringify(result))).catch(error => {
    console.error('Import failed; transaction rolled back:', error.code || error.name)
    process.exitCode = 1
  }).finally(() => store.pool().end())
}
