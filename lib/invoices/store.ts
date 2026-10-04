import { createHash } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import { pool } from '../postgres-store'
import { calculate, invoiceInput, InvoiceError, type InvoiceInput, type InvoiceRecord, type InvoiceSnapshot, type PaymentStatus } from './domain'

type Row = { id: string; number: string; revision: number; payload: InvoiceInput; payment_status: PaymentStatus; payment_version: number; created_at: Date; updated_at: Date; create_hash: string }
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const mapRow = (row: Row): InvoiceRecord => ({
  id: row.id, number: row.number, revision: row.revision, invoice: row.payload,
  paymentStatus: row.payment_status, paymentVersion: row.payment_version,
  createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString(),
  totalCents: calculate(row.payload).totalCents, exports: [],
})

// Dependency injection keeps tests on isolated PostgreSQL engines, never production.
export function invoiceStore(db: Pool = pool()) {
  async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
    const client = await db.connect()
    try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result }
    catch (error) { await client.query('ROLLBACK'); throw error }
    finally { client.release() }
  }
  return {
    async list(offset = 0) {
      const result = await db.query<Row>('SELECT * FROM portfolio.invoices ORDER BY created_at DESC, id LIMIT 51 OFFSET $1', [offset])
      return { invoices: result.rows.slice(0, 50).map(mapRow), hasMore: result.rows.length > 50 }
    },
    async get(id: string) {
      const result = await db.query<Row>('SELECT * FROM portfolio.invoices WHERE id=$1', [id])
      if (!result.rows[0]) throw new InvoiceError(404, 'Invoice not found')
      const versions = await db.query('SELECT revision, sha256, created_at FROM portfolio.invoice_exports WHERE invoice_id=$1 ORDER BY revision DESC', [id])
      const events = await db.query('SELECT version, status, changed_at FROM portfolio.invoice_payment_events WHERE invoice_id=$1 ORDER BY version DESC', [id])
      return { ...mapRow(result.rows[0]), exports: versions.rows.map(v => ({ revision: v.revision, sha256: v.sha256, createdAt: new Date(v.created_at).toISOString() })),
        paymentEvents: events.rows.map(v => ({ version: v.version, status: v.status, changedAt: new Date(v.changed_at).toISOString() })) }
    },
    async create(id: string, value: InvoiceInput) {
      const input = invoiceInput.parse(value)
      const digest = hash(JSON.stringify(input))
      return transaction(async client => {
        // Counter upserts serialize allocation across processes. The separate INV namespace
        // cannot collide with archived YYYY_NNNNN numbers; no historical import is implicit.
        const counter = await client.query('INSERT INTO portfolio.invoice_counters(year,value) VALUES ($1,1) ON CONFLICT (year) DO UPDATE SET value=portfolio.invoice_counters.value+1 RETURNING value', [Number(input.issueDate.slice(0, 4))])
        const number = `INV-${input.issueDate.slice(0, 4)}-${String(counter.rows[0].value).padStart(5, '0')}`
        const inserted = await client.query<Row>('INSERT INTO portfolio.invoices(id,number,create_hash,payload) VALUES ($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING RETURNING *', [id, number, digest, JSON.stringify(input)])
        if (inserted.rows[0]) return mapRow(inserted.rows[0])
        const existing = await client.query<Row>('SELECT * FROM portfolio.invoices WHERE id=$1', [id])
        if (existing.rows[0].create_hash !== digest) throw new InvoiceError(409, 'This request was already used for different invoice data')
        return mapRow(existing.rows[0])
      })
    },
    async update(id: string, revision: number, value: InvoiceInput) {
      const input = invoiceInput.parse(value)
      const result = await db.query<Row>('UPDATE portfolio.invoices SET payload=$3,revision=revision+1,updated_at=now() WHERE id=$1 AND revision=$2 RETURNING *', [id, revision, JSON.stringify(input)])
      if (!result.rows[0]) throw new InvoiceError(409, 'Invoice changed; reload before saving')
      return mapRow(result.rows[0])
    },
    async payment(id: string, version: number, status: PaymentStatus) {
      return transaction(async client => {
        const result = await client.query<Row>('UPDATE portfolio.invoices SET payment_status=$3,payment_version=payment_version+1,updated_at=now() WHERE id=$1 AND payment_version=$2 RETURNING *', [id, version, status])
        if (!result.rows[0]) throw new InvoiceError(409, 'Payment status changed; reload before saving')
        const row = result.rows[0]
        await client.query('INSERT INTO portfolio.invoice_payment_events(invoice_id,version,status) VALUES ($1,$2,$3)', [id, row.payment_version, status])
        return mapRow(row)
      })
    },
    async export(id: string, revision: number, render: (snapshot: InvoiceSnapshot) => Promise<Buffer>) {
      return transaction(async client => {
        const result = await client.query<Row>('SELECT * FROM portfolio.invoices WHERE id=$1 FOR UPDATE', [id])
        const row = result.rows[0]
        if (!row) throw new InvoiceError(404, 'Invoice not found')
        if (row.revision !== revision) throw new InvoiceError(409, 'Invoice changed; reload before exporting')
        const existing = await client.query('SELECT sha256 FROM portfolio.invoice_exports WHERE invoice_id=$1 AND revision=$2', [id, revision])
        if (existing.rows[0]) return { revision, sha256: existing.rows[0].sha256 }
        const input = invoiceInput.parse(row.payload)
        const snapshot: InvoiceSnapshot = { number: row.number, revision, invoice: input, ...calculate(input) }
        const pdf = await render(snapshot)
        if (!pdf.subarray(0, 5).equals(Buffer.from('%PDF-')) || pdf.length > 10000000) throw new InvoiceError(422, 'PDF could not be generated within the size limit')
        const sha256 = hash(pdf)
        await client.query('INSERT INTO portfolio.invoice_exports(invoice_id,revision,snapshot,pdf,sha256) VALUES ($1,$2,$3,$4,$5)', [id, revision, JSON.stringify(snapshot), pdf, sha256])
        return { revision, sha256 }
      })
    },
    async pdf(id: string, revision: number) {
      const result = await db.query('SELECT pdf, sha256, snapshot FROM portfolio.invoice_exports WHERE invoice_id=$1 AND revision=$2', [id, revision])
      if (!result.rows[0]) throw new InvoiceError(404, 'Export not found')
      return result.rows[0] as { pdf: Buffer; sha256: string; snapshot: InvoiceSnapshot }
    },
  }
}
