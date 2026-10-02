// Runs real PostgreSQL SQL in an isolated WASM database; no production access.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { PGlite } = require('@electric-sql/pglite')
const { ObjectId, Long, Binary, Decimal128 } = require('bson')
const store = require('../lib/postgres-store')
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } })

test('PostgreSQL persistence and existing model behavior', async t => {
  const db = new PGlite()
  let tail = Promise.resolve()
  const connection = {
    query: (sql, args) => db.query(sql, args),
    async connect() {
      const prior = tail
      let unlock
      tail = new Promise(resolve => { unlock = resolve })
      await prior
      return { query: (sql, args) => db.query(sql, args), release: () => unlock() }
    },
  }
  store.configurePool(connection)
  await store.migrateSchema()
  await store.migrateSchema()
  const Admin = require('../models/Admin').default
  const Skill = require('../models/Skill').default
  const Project = require('../models/Project').default
  const Comment = require('../models/Comment').default
  const Blog = require('../models/Blog').default
  const Subscriber = require('../models/Subscriber').default
  const Section = require('../models/Section').SectionModel
  let admin, skill, project, blog
  await t.test('hashes, login verification, dates, duplicate email', async () => {
    admin = await Admin.create({ email: 'synthetic@example.test', name: 'Test', password: 'test-only-password' })
    assert.notEqual(admin.password, 'test-only-password')
    const loaded = await Admin.findOne({ email: admin.email })
    assert.equal(await loaded.comparePassword('test-only-password'), true)
    assert.equal(await loaded.comparePassword('wrong'), false)
    const hash = loaded.password
    loaded.name = 'Updated'
    await loaded.save()
    assert.equal(loaded.password, hash, 'an unchanged imported hash must not be hashed again')
    assert.ok((await Admin.findById(admin._id).lean()).createdAt instanceof Date)
    await assert.rejects(Admin.create({ email: admin.email, name: 'Duplicate', password: 'other' }), e => e.code === 11000)
  })
  await t.test('schema validation and ObjectId population', async () => {
    await assert.rejects(Skill.create({ name: 'Missing required fields' }), e => e.name === 'ValidationError')
    skill = await Skill.create({ name: 'PostgreSQL', category: 'Database', icon: 'database' })
    project = await Project.create({ title: 'Migración ágil', subtitle: 'Test', description: 'Descripción', technologies: [skill._id] })
    assert.equal(project.slug, 'migracion-agil')
    const populated = await Project.findById(project._id).populate('technologies').lean().exec()
    assert.equal(populated.technologies[0].name, 'PostgreSQL')
    assert.equal(String(populated.technologies[0]._id), String(skill._id))
    await assert.rejects(Project.create({ title: project.title, subtitle: 'Test', description: 'duplicate', technologies: [] }), e => e.code === 11000)
  })
  await t.test('projection, regex, membership, numeric ordering, null and missing', async () => {
    await Section.create([{ title: 'Contact', order: 10, visible: true, content: {} }, { title: 'About', order: 2, visible: false, content: { nested: 'value' } }])
    const sections = await Section.find({ order: { $gte: 2 } }).sort({ order: 1 }).select('title order').lean()
    assert.deepEqual(sections.map(s => s.order), [2, 10])
    assert.equal(sections[0].content, undefined)
    assert.equal((await Section.findOne({ title: /^contact$/i }).lean()).title, 'Contact')
    assert.equal(await Section.countDocuments({ $or: [{ visible: true }, { title: 'About' }] }), 2)
    assert.equal(await Section.countDocuments({ absent: { $exists: false } }), 2)
    assert.equal(await Section.countDocuments({ absent: null }), 2)
    assert.equal(await Section.countDocuments({ visible: { $ne: true } }), 1)
    assert.equal(await Project.countDocuments({ technologies: skill._id }), 1)
    assert.equal(await Project.countDocuments({ _id: { $in: [project._id] } }), 1)
    assert.equal((await Section.find().sort({ order: 1 }).skip(1).limit(1).lean())[0].order, 10)
  })
  await t.test('subscriber confirmation and timestamp updates', async () => {
    const subscriber = await Subscriber.create({ email: 'subscriber@example.test', token: 'synthetic-unsubscribe', confirmToken: 'synthetic-confirm' })
    const loaded = await Subscriber.findOne({ confirmToken: subscriber.confirmToken })
    loaded.confirmed = true; loaded.confirmedAt = new Date(); loaded.confirmToken = undefined
    await loaded.save()
    const fresh = await Subscriber.findById(loaded._id).lean()
    assert.equal(fresh.confirmed, true)
    assert.equal(fresh.confirmToken, undefined)
    assert.ok(fresh.confirmedAt instanceof Date)
    assert.equal(await Subscriber.countDocuments({ confirmed: true, unsubscribed: false }), 1)
  })
  await t.test('blog fields and comment relationships/votes/optimistic concurrency', async () => {
    const fields = { title: 'T', subtitle: 'S', content: 'C', slug: 'test', published: true }
    for (const key of ['title', 'subtitle', 'content']) for (const lang of ['en', 'es']) fields[`${key}_${lang}`] = fields[key]
    blog = await Blog.create(fields)
    const comment = await Comment.create({ blog: blog._id, alias: 'Test', content: 'Comment', ip: '127.0.0.1' })
    const a = await Comment.findById(comment._id), b = await Comment.findById(comment._id)
    a.votes.push({ ip: 'test-1', value: 1 }); await a.save()
    b.votes.push({ ip: 'test-2', value: 1 }); await assert.rejects(b.save(), /version/i)
    const updated = await Comment.findByIdAndUpdate(comment._id, { $set: { status: 'pending' } }, { new: true, runValidators: true }).populate('blog', 'title slug')
    assert.equal(updated.status, 'pending'); assert.equal(updated.blog.slug, 'test')
    assert.equal((await Comment.findById(comment._id).lean()).votes.length, 1)
    const deleted = await Comment.findByIdAndDelete(comment._id)
    assert.equal(String(deleted._id), String(comment._id))
    assert.equal(await Comment.countDocuments({}), 0)
  })
  await t.test('BSON fidelity and unsupported operations fail closed', async () => {
    const doc = { _id: new ObjectId(), arbitrary: { integer: Long.fromString('9007199254740993'), decimal: Decimal128.fromString('123.45'), binary: new Binary(Buffer.from([0, 1, 255])), date: new Date('2020-01-01T00:00:00.123Z') } }
    await store.collection('sections').insertOne(doc)
    const found = await store.collection('sections').findOne({ _id: doc._id })
    assert.equal(found.arbitrary.integer.toString(), '9007199254740993')
    assert.equal(found.arbitrary.decimal.toString(), '123.45')
    assert.deepEqual(found.arbitrary.binary.buffer, doc.arbitrary.binary.buffer)
    assert.equal(found.arbitrary.date.toISOString(), doc.arbitrary.date.toISOString())
    assert.throws(() => store.compileFilter({ $where: 'untrusted' }), /Unsupported/)
    await assert.rejects(store.collection('sections').updateOne({ _id: doc._id }, { $rename: { arbitrary: 'x' } }), /Unsupported/)
    assert.ok((await store.collection('sections').findOne({ _id: doc._id })).arbitrary)
  })
  await db.close()
  store.configurePool(undefined)
})
