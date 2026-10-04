// Proofs only: does not access a database, reserve a number or issue an invoice.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node', jsx: 'react-jsx' } })
const { renderInvoice } = require('../../lib/invoices/pdf')
const { calculate, invoiceInput } = require('../../lib/invoices/domain')
async function main() {
  const output = path.resolve('.qa/pdf')
  fs.mkdirSync(output, { recursive: true })
  const base = { issueDate: '2028-02-29', placeOfIssue: 'Argentina', supplier: 'Iñaki Fernando Lozano', representative: 'José Muñoz', email: 'qa@example.test', phone: '+00 000 000', customerCompany: 'SYNTHETIC QA — ÁÉÍÓÚ ü ñ', customerAddress: 'Dirección sintética 123', currency: 'USD', items: [{ title: 'Diseño y documentación', description: 'Prueba sintética: precisión, acción, pingüino y año. No corresponde a una factura emitida.', unitPrice: '0.10' }, { title: 'Desarrollo', description: 'Segunda línea de prueba, sin firma ni envío.', unitPrice: '0.20' }] }
  const unsupported = { ...base, customerCompany: 'Unsupported 🦄' }
  await assert.rejects(renderInvoice({ number: 'QA', revision: 1, invoice: unsupported, ...calculate(unsupported) }, true), error => error.status === 422)
  async function save(name, input) {
    const invoice = invoiceInput.parse(input)
    const snapshot = { number: 'QA-REFERENCE', revision: 1, invoice, ...calculate(invoice) }
    fs.writeFileSync(path.join(output, name + '.pdf'), await renderInvoice(snapshot, true))
  }
  await save('accents', base)
  await save('multipage', { ...base, items: Array.from({ length: 20 }, (_, i) => ({ title: `SYNTHETIC ITEM ${i + 1}`, description: (`CONTINUATION_${i + 1} Descripción extensa con acentos, trabajo y verificación. `).repeat(18) + ` END_ITEM_${i + 1}`, unitPrice: '12.34' })) })
  await save('long-fields', { ...base, supplier: 'Proveedor '.repeat(14).trim(), representative: 'Representación '.repeat(9).trim(), email: 'long.address.for.rendering.verification@example.test', customerCompany: 'Empresa de prueba '.repeat(9).trim(), customerAddress: 'Dirección extensa con acentos y número 123, '.repeat(7).trim(), items: [{ title: 'Título largo '.repeat(12).trim(), description: 'x'.repeat(2500) + ' END_LONG_TOKEN', unitPrice: '99999999.99' }] })
  if (process.argv[2]) {
    const source = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).invoice
    const invoice = Object.fromEntries(['issueDate','placeOfIssue','supplier','representative','email','phone','customerCompany','customerAddress','currency'].map(k => [k, k === 'issueDate' ? source.dateOfIssue : source[k]]))
    invoice.items = source.items.map(i => ({ title: i.title, description: i.description, unitPrice: String(i.unitPrice) }))
    await save('reference-comparison', invoice)
  }
  console.log('Unsigned proof PDFs written to .qa/pdf')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
