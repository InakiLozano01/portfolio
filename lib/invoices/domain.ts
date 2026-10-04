import { z } from 'zod'

// Decimal strings cross every boundary; amounts never pass through floating point.
const text = (max: number, multiline = false) => z.string().trim().min(1).max(max)
  .refine(v => !/[\u0000-\u0008\u000b-\u001f\u007f]/.test(v), 'Invalid control character')
  .refine(v => multiline ? (v.match(/\n/g) || []).length <= 40 : !/[\r\n\t]/.test(v), multiline ? 'At most 40 line breaks per description' : 'Use a single line')
const money = z.string().regex(/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/, 'Use a positive decimal with at most two decimal places')
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const d = new Date(value + 'T12:00:00Z')
  return value >= '2000-01-01' && value <= '9999-12-31' && !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value
}, 'Invalid calendar date')

export const invoiceInput = z.object({
  issueDate: date,
  placeOfIssue: text(100),
  supplier: text(140),
  representative: text(140),
  email: z.string().trim().email().max(180),
  phone: text(80),
  customerCompany: text(180),
  customerAddress: text(350),
  currency: z.literal('USD'),
  items: z.array(z.object({
    title: text(160), description: text(3000, true), unitPrice: money,
  }).strict()).min(1).max(40),
}).strict().refine(v => v.items.reduce((n, i) => n + i.description.length + i.title.length, 0) <= 30000,
  'The combined item text must be at most 30000 characters')

export type InvoiceInput = z.infer<typeof invoiceInput>
export type PaymentStatus = 'unpaid' | 'paid' | 'unknown'
export const paymentInput = z.object({ status: z.enum(['unpaid', 'paid', 'unknown']), version: z.number().int().nonnegative() }).strict()
export const createInput = z.object({ requestId: z.string().uuid(), invoice: invoiceInput }).strict()
export const updateInput = z.object({ revision: z.number().int().positive(), invoice: invoiceInput }).strict()
export const exportInput = z.object({ revision: z.number().int().positive() }).strict()

export function cents(decimal: string): bigint {
  const [whole, fraction = ''] = money.parse(decimal).split('.')
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0'))
}
export function decimal(value: bigint | string): string {
  const n = BigInt(value)
  return `${n / BigInt(100)}.${(n % BigInt(100)).toString().padStart(2, '0')}`
}
export function calculate(input: InvoiceInput) {
  const lineCents = input.items.map(item => cents(item.unitPrice).toString())
  const totalCents = lineCents.reduce((total, line) => total + BigInt(line), BigInt(0)).toString()
  return { lineCents, totalCents }
}
export function displayDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}
export type InvoiceSnapshot = {
  number: string; revision: number; invoice: InvoiceInput; lineCents: string[]; totalCents: string
}
export type InvoiceRecord = {
  id: string; number: string; revision: number; invoice: InvoiceInput;
  paymentStatus: PaymentStatus; paymentVersion: number; createdAt: string; updatedAt: string;
  totalCents: string; exports: { revision: number; sha256: string; createdAt: string }[]
}
export class InvoiceError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
