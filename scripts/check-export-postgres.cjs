const fs = require('fs')
const { PGlite } = require('@electric-sql/pglite')
const store = require('../lib/postgres-store')
const { readExport, importExport } = require('./import-mongo-export.cjs')
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } })

async function check(directory, reportPath) {
  const db = new PGlite()
  let tail = Promise.resolve()
  store.configurePool({ query: (sql, args) => db.query(sql, args), async connect() {
    const prior = tail; let unlock; tail = new Promise(resolve => { unlock = resolve }); await prior
    return { query: (sql, args) => db.query(sql, args), release: () => unlock() }
  } })
  try {
    const first = await importExport(directory)
    const second = await importExport(directory)
    if (!second.alreadyImported) throw new Error('Idempotency check failed')
    const source = readExport(directory)
    const Admin = require('../models/Admin').default
    const Project = require('../models/Project').default
    const Comment = require('../models/Comment').default
    const sourceAdmins = source.collections.find(c => c.name === 'admins').docs
    for (const { document } of sourceAdmins) {
      const admin = await Admin.findOne({ email: document.email })
      if (!admin || String(admin._id) !== String(document._id) || admin.password !== document.password) throw new Error('Admin identity/hash mismatch')
    }
    const projects = await Project.find().populate('technologies').lean()
    const comments = await Comment.find().populate('blog', 'title slug').lean()
    const report = { ...first, exactBsonComparison: true, idempotent: true, adminIdentityAndHashVerified: true,
      populatedProjectCount: projects.length, populatedCommentCount: comments.length,
      realPasswordLogin: 'Not attempted: no password read or requested',
      backend: 'Isolated PostgreSQL engine (PGlite); production cutover not performed' }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 })
    console.log(JSON.stringify(report))
  } finally { await db.close(); store.configurePool(undefined) }
}
check(process.argv[2], process.argv[3]).catch(error => {
  console.error('Export verification failed:', error.code || error.name, error.message.replace(/(?:mongodb|postgres(?:ql)?):\/\/\S+/g, '[redacted]'))
  process.exitCode = 1
})
