const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node', jsx: 'react-jsx' } })
const { invoiceStore } = require('../../lib/invoices/store')
const realRenderer = process.env.INVOICE_TEST_PDF === 'true' ? require('../../lib/invoices/pdf').renderInvoice : null
const makePdf = (snapshot, label) => realRenderer ? realRenderer(snapshot, true) : Promise.resolve(Buffer.from('%PDF-' + label))

// The optional real-server mode only accepts a private Unix socket. It never
// uses DATABASE_URL or any existing app connection, and requires an empty DB.
test('invoice persistence, races and immutable exports', async t => {
  let db, close
  if (process.env.INVOICE_TEST_SOCKET) {
    assert.ok(process.env.INVOICE_TEST_SOCKET.startsWith('/home/ilozano/portfolio-invoices-20261004/.qa/'))
    const { Pool } = require('pg')
    db = new Pool({ host: process.env.INVOICE_TEST_SOCKET, user: 'postgres', database: 'postgres', max: 8 })
    const existing = await db.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name='portfolio'")
    assert.equal(existing.rows.length, 0, 'Refuse any database with an existing portfolio schema')
    close = () => db.end()
  } else {
    const { PGlite } = require('@electric-sql/pglite')
    const engine = new PGlite()
    let tail = Promise.resolve()
    db = { query: (sql, args) => engine.query(sql, args), async connect() {
      const previous = tail; let unlock; tail = new Promise(r => { unlock = r }); await previous
      return { query: (sql, args) => engine.query(sql, args), release: unlock }
    } }
    // PGlite exec accepts multi-statement DDL.
    await engine.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'))
    close = () => engine.close()
  }
  try {
    if (process.env.INVOICE_TEST_SOCKET) await db.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'))
    const store = invoiceStore(db)
    const input = { issueDate: '2028-02-29', placeOfIssue: 'Argentina', supplier: 'José Muñoz', representative: 'Iñaki', email: 'qa@example.test', phone: '+00 000', customerCompany: 'SYNTHETIC QA', customerAddress: 'Test address', currency: 'USD', items: [{ title: 'Diseño ágil', description: 'Prueba de persistencia', unitPrice: '0.10' }, { title: 'Desarrollo', description: 'Sintético', unitPrice: '0.20' }] }
    let invoice
    await t.test('concurrent creation assigns unique numbers and preserves exact cents', async () => {
      const created = await Promise.all(Array.from({ length: 12 }, () => store.create(randomUUID(), input)))
      assert.equal(new Set(created.map(r => r.number)).size, 12)
      assert.ok(created.every(r => r.totalCents === '30'))
      invoice = created[0]
    })
    await t.test('concurrent retries are idempotent and a changed payload is refused', async () => {
      const id = randomUUID()
      const records = await Promise.all(Array.from({ length: 4 }, () => store.create(id, input)))
      assert.equal(new Set(records.map(r => r.number)).size, 1)
      await assert.rejects(store.create(id, { ...input, customerCompany: 'Different' }), e => e.status === 409)
    })
    await t.test('stale concurrent edits have exactly one winner', async () => {
      const results = await Promise.allSettled([store.update(invoice.id, 1, input), store.update(invoice.id, 1, { ...input, customerCompany: 'Competing' })])
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
      assert.equal(results.find(r => r.status === 'rejected').reason.status, 409)
    })
    let bytes, checksum
    await t.test('concurrent exports render once and preserve bytes across store instances', async () => {
      let calls = 0
      const render = async snapshot => { calls++; bytes = await makePdf(snapshot, 'synthetic immutable v2'); return bytes }
      const results = await Promise.all(Array.from({ length: 4 }, () => store.export(invoice.id, 2, render)))
      assert.equal(calls, 1)
      checksum = results[0].sha256
      assert.equal(new Set(results.map(r => r.sha256)).size, 1)
      assert.deepEqual(Buffer.from((await invoiceStore(db).pdf(invoice.id, 2)).pdf), bytes)
    })
    await t.test('payment races are audited separately and cannot change a PDF', async () => {
      const results = await Promise.allSettled([store.payment(invoice.id, 0, 'paid'), store.payment(invoice.id, 0, 'unpaid')])
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
      const record = await store.get(invoice.id)
      assert.equal(record.revision, 2)
      assert.equal(record.paymentEvents.length, 1)
      assert.equal((await store.pdf(invoice.id, 2)).sha256, checksum)
    })
    await t.test('later edits create a new export without rewriting the prior version', async () => {
      await store.update(invoice.id, 2, { ...input, items: [{ ...input.items[0], unitPrice: '25.01' }] })
      await assert.rejects(store.export(invoice.id, 2, async () => bytes), e => e.status === 409)
      await store.export(invoice.id, 3, async snapshot => {
        assert.equal(snapshot.totalCents, '2501'); return makePdf(snapshot, 'new synthetic revision')
      })
      assert.deepEqual(Buffer.from((await store.pdf(invoice.id, 2)).pdf), bytes)
      assert.equal((await store.get(invoice.id)).exports.length, 2)
    })
    await t.test('database itself prevents export and payment-history mutation', async () => {
      await assert.rejects(db.query('UPDATE portfolio.invoice_exports SET sha256=$2 WHERE invoice_id=$1', [invoice.id, 'f'.repeat(64)]), /immutable/)
      await assert.rejects(db.query('DELETE FROM portfolio.invoice_exports WHERE invoice_id=$1', [invoice.id]), /immutable/)
      await assert.rejects(db.query('DELETE FROM portfolio.invoice_payment_events WHERE invoice_id=$1', [invoice.id]), /immutable/)
    })
    await t.test('failed rendering rolls back and can be retried', async () => {
      const record = await store.create(randomUUID(), input)
      await assert.rejects(store.export(record.id, 1, async () => { throw new Error('Synthetic failure') }))
      assert.equal((await store.get(record.id)).exports.length, 0)
      await store.export(record.id, 1, snapshot => makePdf(snapshot, 'render retry'))
      assert.equal((await store.get(record.id)).exports.length, 1)
    })
  } finally { await close() }
})
