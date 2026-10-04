import { calculate, cents, decimal, displayDate, invoiceInput } from '../../lib/invoices/domain'

const base = { issueDate: '2028-02-29', placeOfIssue: 'Argentina', supplier: 'José Muñoz', representative: 'Iñaki', email: 'test@example.test', phone: '+00 000', customerCompany: 'Synthetic QA', customerAddress: 'Test address', currency: 'USD', items: [{ title: 'Diseño', description: 'Descripción ágil', unitPrice: '0.10' }, { title: 'Work', description: 'Test', unitPrice: '0.20' }] }
test('decimal arithmetic remains exact including maximum totals', () => {
  expect(calculate(invoiceInput.parse(base)).totalCents).toBe('30')
  expect(decimal(cents('99999999.99') * BigInt(40))).toBe('3999999999.60')
  expect(decimal(cents('1.1'))).toBe('1.10')
})
test.each(['-1', '1e3', 'NaN', 'Infinity', '1,20', '0.001', '100000000', '01'])('rejects invalid amount %s', amount => {
  expect(invoiceInput.safeParse({ ...base, items: [{ ...base.items[0], unitPrice: amount }] }).success).toBe(false)
})
test('calendar dates do not depend on timezone and impossible dates fail', () => {
  expect(displayDate('2028-02-29')).toBe('29/02/2028')
  for (const issueDate of ['2026-02-29','2026-04-31','2026-13-01','2026-01-01T00:00:00Z']) expect(invoiceInput.safeParse({ ...base, issueDate }).success).toBe(false)
})
test('server rejects injected totals, empty items and oversized content', () => {
  expect(invoiceInput.safeParse({ ...base, total: 0 }).success).toBe(false)
  expect(invoiceInput.safeParse({ ...base, items: [] }).success).toBe(false)
  expect(invoiceInput.safeParse({ ...base, items: [{ ...base.items[0], quantity: 2 }] }).success).toBe(false)
  expect(invoiceInput.safeParse({ ...base, customerCompany: 'x'.repeat(181) }).success).toBe(false)
})
