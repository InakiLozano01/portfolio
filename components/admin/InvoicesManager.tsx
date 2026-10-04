'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { calculate, decimal, displayDate, invoiceInput, type InvoiceInput, type InvoiceRecord, type PaymentStatus } from '@/lib/invoices/domain'

type Detail = InvoiceRecord & { paymentEvents?: { version: number; status: PaymentStatus; changedAt: string }[] }
function blank(): InvoiceInput {
  const d = new Date()
  return {
    issueDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    placeOfIssue: 'Argentina', supplier: 'Iñaki Fernando Lozano', representative: 'Iñaki Fernando Lozano',
    email: 'ilozano@inakilozano.com', phone: '+54 9 381 472-3363',
    customerCompany: '', customerAddress: '', currency: 'USD', items: [{ title: '', description: '', unitPrice: '0.00' }],
  }
}
async function api<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch('/api/admin/invoices' + url, { method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const data = await response.json()
  if (!response.ok) throw new Error(data.fields?.length ? data.fields.map((v: { path: string; message: string }) => `${v.path}: ${v.message}`).join('; ') : data.error || 'Request failed')
  return data
}
const fields: { key: Exclude<keyof InvoiceInput, 'items' | 'currency'>; label: string; max: number; type?: string }[] = [
  { key: 'issueDate', label: 'Issue date', max: 10, type: 'date' },
  { key: 'placeOfIssue', label: 'Place of issue', max: 100 },
  { key: 'supplier', label: 'Supplier', max: 140 },
  { key: 'representative', label: 'Representative', max: 140 },
  { key: 'email', label: 'Email', max: 180, type: 'email' },
  { key: 'phone', label: 'Phone', max: 80 },
  { key: 'customerCompany', label: 'Company name', max: 180 },
  { key: 'customerAddress', label: 'Business address', max: 350 },
]
const control = 'block w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900 disabled:bg-slate-100'

export default function InvoicesManager() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [selected, setSelected] = useState<Detail | null>(null)
  const [form, setForm] = useState<InvoiceInput>(blank)
  const [requestId, setRequestId] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  async function refresh(page = offset) {
    const data = await api<{ invoices: InvoiceRecord[]; hasMore: boolean }>(`?offset=${page}`)
    setInvoices(data.invoices); setHasMore(data.hasMore)
  }
  useEffect(() => {
    let active = true
    api<{ invoices: InvoiceRecord[]; hasMore: boolean }>(`?offset=${offset}`).then(data => {
      if (active) { setInvoices(data.invoices); setHasMore(data.hasMore) }
    }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [offset])
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await action() } catch (e) { setError(e instanceof Error ? e.message : 'Operation failed') }
    finally { setBusy(false) }
  }
  function replace(record: Detail) { setSelected(record); setForm(record.invoice); setDirty(false) }
  function edit(next: InvoiceInput) { setForm(next); setDirty(true) }
  const parsed = invoiceInput.safeParse(form)
  const total = parsed.success ? decimal(calculate(parsed.data).totalCents) : null
  const canDiscard = () => !dirty || window.confirm('Discard unsaved invoice changes?')
  return <section className="space-y-5 pb-8" aria-label="Invoices">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-xl font-semibold">Invoices</h3><p className="text-sm text-slate-600">Private PDF history and manual payment tracking.</p></div>
      <Button disabled={busy} onClick={() => { if (canDiscard()) { setSelected(null); setForm(blank()); setRequestId(crypto.randomUUID()); setDirty(false); setError(''); setNotice('') } }}>New invoice</Button>
    </div>
    {error && <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded border border-green-300 bg-green-50 p-3">{notice}</p>}
    <div className="grid items-start gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-lg border bg-white p-4">
        <h4 className="mb-3 font-semibold">Saved invoices</h4>
        {!invoices.length && <p className="text-sm text-slate-500">No invoices on this page.</p>}
        <ul className="space-y-2">{invoices.map(record => <li key={record.id}>
          <button disabled={busy} className={`w-full rounded border p-3 text-left ${selected?.id === record.id ? 'border-slate-800 bg-slate-50' : 'border-slate-200'}`} onClick={() => {
            if (canDiscard()) void run(async () => replace(await api<Detail>(`/${record.id}`)))
          }}>
            <span className="block font-medium">{record.number}</span>
            <span className="block break-words text-sm">{record.invoice.customerCompany}</span>
            <span className="block text-xs text-slate-600">{displayDate(record.invoice.issueDate)} · USD {decimal(record.totalCents)} · {record.paymentStatus}</span>
          </button>
        </li>)}</ul>
        <div className="mt-4 flex justify-between gap-2"><Button variant="outline" size="sm" disabled={busy || offset === 0} onClick={() => setOffset(offset - 50)}>Previous</Button><Button variant="outline" size="sm" disabled={busy || !hasMore} onClick={() => setOffset(offset + 50)}>Next</Button></div>
      </aside>
      <div className="min-w-0 space-y-5">
        <form className="space-y-5 rounded-lg border bg-white p-4 md:p-6" onSubmit={event => {
          event.preventDefault()
          void run(async () => {
            const invoice = invoiceInput.parse(form)
            const id = selected ? selected.id : requestId || crypto.randomUUID()
            setRequestId(id)
            const record = selected
              ? await api<Detail>(`/${selected.id}`, 'PUT', { revision: selected.revision, invoice })
              : await api<Detail>('', 'POST', { requestId: id, invoice })
            replace(await api<Detail>(`/${record.id}`)); await refresh(); setNotice('Invoice saved. Export a PDF to preserve this version.')
          })
        }}>
          <div><h4 className="font-semibold">{selected ? `${selected.number} · revision ${selected.revision}` : 'New invoice'}</h4><p className="mt-1 text-sm text-slate-600">USD. Each row represents one item. A number is reserved when first saved; exported versions remain unchanged.</p></div>
          <fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">{fields.map(field => <label className="text-sm font-medium" key={field.key}>{field.label}
            <input required type={field.type || 'text'} maxLength={field.max} className={control + ' mt-1'} value={form[field.key]} onChange={event => edit({ ...form, [field.key]: event.target.value })} />
          </label>)}</fieldset>
          <fieldset disabled={busy} className="space-y-4"><legend className="mb-3 font-semibold">Items</legend>{form.items.map((item, index) => <div key={index} className="space-y-3 rounded border p-3">
            <div className="flex items-center justify-between gap-3"><span className="font-medium">Item {String(index + 1).padStart(3, '0')}</span><Button type="button" variant="outline" size="sm" disabled={busy || form.items.length === 1} onClick={() => edit({ ...form, items: form.items.filter((_, i) => i !== index) })}>Remove item {index + 1}</Button></div>
            <label className="block text-sm">Title<input required maxLength={160} className={control} value={item.title} onChange={e => edit({ ...form, items: form.items.map((v, i) => i === index ? { ...v, title: e.target.value } : v) })} /></label>
            <label className="block text-sm">Description<textarea required maxLength={3000} rows={4} className={control} value={item.description} onChange={e => edit({ ...form, items: form.items.map((v, i) => i === index ? { ...v, description: e.target.value } : v) })} /></label>
            <label className="block text-sm">Unit price / line total (USD)<input required inputMode="decimal" pattern="(0|[1-9][0-9]{0,7})(\.[0-9]{1,2})?" className={control} value={item.unitPrice} onChange={e => edit({ ...form, items: form.items.map((v, i) => i === index ? { ...v, unitPrice: e.target.value } : v) })} /></label>
          </div>)}<Button type="button" variant="outline" disabled={busy || form.items.length >= 40} onClick={() => edit({ ...form, items: [...form.items, { title: '', description: '', unitPrice: '0.00' }] })}>Add item</Button></fieldset>
          <div className="flex flex-wrap items-center justify-between gap-3"><strong>Total: {total === null ? 'Complete valid fields' : `USD ${total}`}</strong><div className="flex gap-2">
            {selected && <Button type="button" variant="outline" disabled={busy} onClick={() => { if (canDiscard()) void run(async () => replace(await api<Detail>(`/${selected.id}`))) }}>Reload saved</Button>}
            <Button type="submit" disabled={busy || !parsed.success || (!!selected && !dirty)}>{busy ? 'Working…' : 'Save invoice'}</Button>
          </div></div>
        </form>
        {selected && <section className="space-y-4 rounded-lg border bg-white p-4 md:p-6" aria-label="Payment and PDF history">
          <div className="flex flex-wrap items-end gap-3"><label className="text-sm font-medium">Payment status (manual)
            <select aria-label="Payment status" className={control + ' mt-1'} disabled={busy} value={selected.paymentStatus} onChange={e => void run(async () => {
              await api(`/${selected.id}/payment`, 'PATCH', { status: e.target.value, version: selected.paymentVersion })
              const record = await api<Detail>(`/${selected.id}`); setSelected(record); await refresh(); setNotice('Payment status recorded. Existing PDFs are unchanged.')
            })}><option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="unknown">Unknown</option></select>
          </label><p className="text-xs text-slate-600">No payment is collected or verified automatically.</p></div>
          {selected.paymentEvents?.length ? <details><summary className="cursor-pointer text-sm">Payment history</summary><ul className="mt-2 text-sm">{selected.paymentEvents.map(e => <li key={e.version}>{new Date(e.changedAt).toLocaleString()} — {e.status}</li>)}</ul></details> : null}
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-semibold">PDF history</h4><p className="text-sm text-slate-600">Exports are private, unsigned and saved permanently. Save edits before exporting.</p></div><Button disabled={busy || dirty} onClick={() => void run(async () => {
            await api(`/${selected.id}/exports`, 'POST', { revision: selected.revision })
            replace(await api<Detail>(`/${selected.id}`)); setNotice('PDF version saved. Download it from the history below.')
          })}>Export saved revision</Button></div>
          {!selected.exports.length && <p className="text-sm text-slate-500">No PDF exported yet.</p>}
          <ul className="space-y-2">{selected.exports.map(version => <li key={version.revision} className="rounded border p-3 text-sm">
            <a className="font-medium underline" href={`/api/admin/invoices/${selected.id}/exports/${version.revision}`}>Download PDF · revision {version.revision}</a>
            <span className="ml-2 text-slate-600">{new Date(version.createdAt).toLocaleString()}</span>
            <details className="mt-1 text-xs text-slate-500"><summary>Integrity checksum</summary><code className="break-all">{version.sha256}</code></details>
          </li>)}</ul>
        </section>}
      </div>
    </div>
  </section>
}
