const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const zlib = require('node:zlib')
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node', jsx: 'react-jsx' } })
const { renderInvoice } = require('../../lib/invoices/pdf')
const { calculate } = require('../../lib/invoices/domain')

// A generated test mark exercises PNG embedding without storing a real signature.
function chunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type), data])
  let crc = 0xffffffff
  for (const byte of payload) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0)
  return Buffer.concat([length, payload, checksum])
}
function testPng() {
  const width = 818, height = 198, header = Buffer.alloc(13)
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6
  const pixels = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 80; y < 100; y++) for (let x = 30; x < 780; x++) pixels[y * (width * 4 + 1) + 1 + x * 4 + 3] = 255
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))])
}
const invoice = { issueDate: '2026-10-05', placeOfIssue: 'Argentina', supplier: 'Synthetic test', representative: 'José', email: 'qa@example.test', phone: '+00 000', customerCompany: 'Synthetic', customerAddress: 'Test address', currency: 'USD', items: [{ title: 'Test', description: 'Never issued or sent', unitPrice: '0.30' }] }
const snapshot = { number: 'TEST-ONLY', revision: 1, invoice, ...calculate(invoice) }
const embedded = bytes => /\/Subtype \/Image\s+\/BitsPerComponent 8\s+\/Width 818\s+\/Height 198/.test(bytes.toString('latin1'))

test('invoice signature embedding, unsigned proofs and configuration failures', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'invoice-signature-test-'))
  const previous = { font: process.env.INVOICE_FONT, signature: process.env.INVOICE_SIGNATURE_PATH }
  try {
    process.env.INVOICE_FONT = 'liberation-sans'
    process.env.INVOICE_SIGNATURE_PATH = path.join(directory, 'signature.png')
    fs.writeFileSync(process.env.INVOICE_SIGNATURE_PATH, testPng(), { mode: 0o600 })
    await t.test('normal export embeds the configured PNG', async () => {
      assert.ok(embedded(await renderInvoice(snapshot)))
    })
    await t.test('proofs stay unsigned even with a configured signature', async () => {
      assert.equal(embedded(await renderInvoice(snapshot, true)), false)
    })
    await t.test('missing or invalid private assets cannot silently produce unsigned exports', async () => {
      fs.unlinkSync(process.env.INVOICE_SIGNATURE_PATH)
      await assert.rejects(renderInvoice(snapshot), error => error.status === 503)
      fs.writeFileSync(process.env.INVOICE_SIGNATURE_PATH, 'invalid')
      await assert.rejects(renderInvoice(snapshot), error => error.status === 503)
      delete process.env.INVOICE_SIGNATURE_PATH
      await assert.rejects(renderInvoice(snapshot), error => error.status === 503)
    })
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
    for (const [key, value] of [['INVOICE_FONT', previous.font], ['INVOICE_SIGNATURE_PATH', previous.signature]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value
    }
  }
})
