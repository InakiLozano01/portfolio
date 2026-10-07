'use client'

import { adminFetch } from '@/lib/admin-fetch'

import { useEffect, useRef, useState } from 'react'
import { Download, Plus, ReceiptText, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { calculate, decimal, displayDate, invoiceInput, type InvoiceInput, type InvoiceRecord, type PaymentStatus } from '@/lib/invoices/domain'
import { Button, Empty, IconButton, Input, PageHeader, Panel, PanelHeader, Select, Status, Textarea, cx, formatDateTime, useUnsavedGuard } from './console/kit'

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
  const response = await adminFetch('/api/admin/invoices' + url, { method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const data = await response.json()
  if (!response.ok) throw new Error(data.fields?.length ? data.fields.map((v: { path: string; message: string }) => `${v.path}: ${v.message}`).join('; ') : data.error || 'Request failed')
  return data
}
/** RFC 4122 v4; crypto.randomUUID only exists in secure contexts, getRandomValues everywhere. */
function uuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
const customer: { key: 'customerCompany' | 'customerAddress'; label: string; max: number }[] = [
  { key: 'customerCompany', label: 'Company name', max: 180 },
  { key: 'customerAddress', label: 'Business address', max: 350 },
]
const supplier: { key: Exclude<keyof InvoiceInput, 'items' | 'currency' | 'customerCompany' | 'customerAddress'>; label: string; max: number; type?: string }[] = [
  { key: 'issueDate', label: 'Issue date', max: 10, type: 'date' },
  { key: 'placeOfIssue', label: 'Place of issue', max: 100 },
  { key: 'supplier', label: 'Supplier', max: 140 },
  { key: 'representative', label: 'Representative', max: 140 },
  { key: 'email', label: 'Email', max: 180, type: 'email' },
  { key: 'phone', label: 'Phone', max: 80 },
]
const payment: Record<PaymentStatus, { label: string; tone: 'live' | 'attention' | 'muted' }> = {
  paid: { label: 'Paid', tone: 'live' },
  unpaid: { label: 'Unpaid', tone: 'attention' },
  unknown: { label: 'Unknown', tone: 'muted' },
}
const label = 'mb-1.5 block text-[13px] font-medium text-fg-soft'

/** Invoices: a numbered, revisioned record per client, immutable PDF exports, and manual payment tracking. */
export default function InvoicesManager() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState<Detail | null>(null)
  const [form, setForm] = useState<InvoiceInput>(blank)
  const [requestId, setRequestId] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [editing, setEditing] = useState(false)
  useUnsavedGuard(dirty)
  const dirtyRef = useRef(dirty)
  useEffect(() => { dirtyRef.current = dirty }, [dirty])

  async function refresh(page = offset) {
    const data = await api<{ invoices: InvoiceRecord[]; hasMore: boolean }>(`?offset=${page}`)
    setInvoices(data.invoices); setHasMore(data.hasMore)
  }
  useEffect(() => {
    let active = true
    api<{ invoices: InvoiceRecord[]; hasMore: boolean }>(`?offset=${offset}`).then(data => {
      if (active) { setInvoices(data.invoices); setHasMore(data.hasMore) }
    }).catch(e => { if (active) setError(e.message) }).finally(() => active && setLoaded(true))
    return () => { active = false }
  }, [offset])
  // The command palette opens this page with ?new=1.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') === '1') startNew()
    const onNew = () => { if (!dirtyRef.current || window.confirm('Discard unsaved invoice changes?')) startNew() }
    window.addEventListener('admin-new-invoice', onNew)
    return () => window.removeEventListener('admin-new-invoice', onNew)
  }, [])

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await action() } catch (e) { setError(e instanceof Error ? e.message : 'Operation failed') }
    finally { setBusy(false) }
  }
  function replace(record: Detail) { setSelected(record); setForm(record.invoice); setDirty(false); setEditing(true) }
  function edit(next: InvoiceInput) { setForm(next); setDirty(true) }
  function startNew() { setSelected(null); setForm(blank()); setRequestId(uuid()); setDirty(false); setError(''); setNotice(''); setEditing(true) }
  const parsed = invoiceInput.safeParse(form)
  const total = parsed.success ? decimal(calculate(parsed.data).totalCents) : null
  const canDiscard = () => !dirty || window.confirm('Discard unsaved invoice changes?')
  const exported = !!selected?.exports.some(version => version.revision === selected.revision)

  return <section aria-label="Invoices">
    <PageHeader
      title="Invoices"
      description="Each invoice keeps every revision; exported PDFs never change. Payment status is tracked by hand."
      actions={<Button variant="primary" icon={Plus} disabled={busy} onClick={() => { if (canDiscard()) startNew() }}>New invoice</Button>}
    />
    {error && <p role="alert" className="mb-4 rounded-2xl border border-signal/40 bg-surface px-5 py-3.5 text-[14px] text-signal-text">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-2xl bg-navy px-5 py-3.5 text-[14px] text-cream">{notice}</p>}
    <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <Panel as="div" className={cx('overflow-hidden', editing && 'hidden xl:block')}>
        <PanelHeader title="Saved invoices" />
        {loaded && !invoices.length ? (
          <Empty icon={ReceiptText} title="No invoices yet">A number is reserved when you first save one.</Empty>
        ) : (
          <ul className="divide-y divide-line/[0.07]">{invoices.map(record => {
            const active = selected?.id === record.id
            return <li key={record.id}>
              <button type="button" disabled={busy} className={cx('flex w-full flex-col gap-1 px-5 py-3.5 text-left transition-colors disabled:opacity-60', active ? 'bg-navy text-cream' : 'hover:bg-fg/[0.03]')} onClick={() => {
                if (canDiscard()) void run(async () => replace(await api<Detail>(`/${record.id}`)))
              }}>
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[13px] font-medium">{record.number}</span>
                  <span className="font-mono text-[13px] tabular">USD {decimal(record.totalCents)}</span>
                </span>
                <span className={cx('block truncate text-[14px]', active ? 'text-cream' : 'text-fg')}>{record.invoice.customerCompany}</span>
                <span className="flex items-center justify-between gap-3">
                  <span className={cx('font-mono text-[11px]', active ? 'text-cream/60' : 'text-fg-dim')}>{displayDate(record.invoice.issueDate)}</span>
                  <Status tone={payment[record.paymentStatus].tone} className={active ? '!text-cream' : ''}>{payment[record.paymentStatus].label}</Status>
                </span>
              </button>
            </li>
          })}</ul>
        )}
        {(offset > 0 || hasMore) && <div className="flex justify-between gap-2 border-t border-line/[0.07] px-4 py-3">
          <Button size="sm" variant="ghost" disabled={busy || offset === 0} onClick={() => setOffset(offset - 50)}>Previous</Button>
          <Button size="sm" variant="ghost" disabled={busy || !hasMore} onClick={() => setOffset(offset + 50)}>Next</Button>
        </div>}
      </Panel>

      <div className={cx('min-w-0 space-y-6', !editing && 'hidden xl:block')}>
        <Panel as="form" onSubmit={(event: React.FormEvent) => {
          event.preventDefault()
          void run(async () => {
            const invoice = invoiceInput.parse(form)
            const id = selected ? selected.id : requestId || uuid()
            setRequestId(id)
            const record = selected
              ? await api<Detail>(`/${selected.id}`, 'PUT', { revision: selected.revision, invoice })
              : await api<Detail>('', 'POST', { requestId: id, invoice })
            replace(await api<Detail>(`/${record.id}`)); await refresh(); setNotice('Invoice saved. Export a PDF to preserve this version.')
          })
        }}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/[0.07] px-5 py-4 sm:px-6">
            <div>
              <Button type="button" size="sm" variant="ghost" className="-ml-3 mb-1 xl:hidden" onClick={() => { if (canDiscard()) { setEditing(false); setDirty(false) } }}>All invoices</Button>
              <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-fg">{selected ? `${selected.number} · revision ${selected.revision}` : 'New invoice'}</h2>
              <p className="mt-0.5 text-[13px] text-fg-dim">Amounts in USD; each item is one line with its total.</p>
            </div>
            {selected && <Status tone={payment[selected.paymentStatus].tone}>{payment[selected.paymentStatus].label}</Status>}
          </div>

          <fieldset disabled={busy} className="grid gap-4 p-5 sm:p-6 md:grid-cols-2">
            <legend className="sr-only">Client</legend>
            {customer.map(field => <label key={field.key} className={field.key === 'customerAddress' ? 'md:col-span-2' : ''}>
              <span className={label}>{field.label}</span>
              <Input required maxLength={field.max} value={form[field.key]} onChange={event => edit({ ...form, [field.key]: event.target.value })} />
            </label>)}
          </fieldset>

          <fieldset disabled={busy} className="border-t border-line/[0.07] px-5 py-5 sm:px-6">
            <legend className="sr-only">Items</legend>
            <div className="space-y-3">{form.items.map((item, index) => <div key={index} className="rounded-2xl border border-line/10 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-2.5 font-mono text-[11px] text-fg-dim">{String(index + 1).padStart(3, '0')}</span>
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
                  <label><span className="sr-only">Title</span><Input required maxLength={160} placeholder="Item title" value={item.title} onChange={e => edit({ ...form, items: form.items.map((v, i) => i === index ? { ...v, title: e.target.value } : v) })} /></label>
                  <label className="relative"><span className="sr-only">Unit price / line total (USD)</span><Input required inputMode="decimal" pattern="(0|[1-9][0-9]{0,7})(\.[0-9]{1,2})?" value={item.unitPrice} onChange={e => edit({ ...form, items: form.items.map((v, i) => i === index ? { ...v, unitPrice: e.target.value } : v) })} className="pl-12 text-right font-mono tabular" /><span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[12px] text-fg-dim">USD</span></label>
                  <label className="sm:col-span-2"><span className="sr-only">Description</span><Textarea required maxLength={3000} rows={3} placeholder="What was delivered" value={item.description} onChange={e => edit({ ...form, items: form.items.map((v, i) => i === index ? { ...v, description: e.target.value } : v) })} /></label>
                </div>
                <IconButton size="sm" label={`Remove item ${index + 1}`} icon={Trash2} disabled={busy || form.items.length === 1} onClick={() => edit({ ...form, items: form.items.filter((_, i) => i !== index) })} className="hover:!text-signal-text" />
              </div>
            </div>)}</div>
            <Button className="mt-3" icon={Plus} disabled={busy || form.items.length >= 40} onClick={() => edit({ ...form, items: [...form.items, { title: '', description: '', unitPrice: '0.00' }] })}>Add item</Button>
          </fieldset>

          <details className="border-t border-line/[0.07]">
            <summary className="cursor-pointer list-none px-5 py-3.5 text-[13px] font-medium text-fg-dim hover:text-fg-soft sm:px-6">Issuer details <span className="font-normal">· {form.supplier}, {displayDate(form.issueDate)}</span></summary>
            <fieldset disabled={busy} className="grid gap-4 px-5 pb-6 sm:px-6 md:grid-cols-2">
              <legend className="sr-only">Issuer</legend>
              {supplier.map(field => <label key={field.key}>
                <span className={label}>{field.label}</span>
                <Input required type={field.type || 'text'} maxLength={field.max} value={form[field.key]} onChange={event => edit({ ...form, [field.key]: event.target.value })} />
              </label>)}
            </fieldset>
          </details>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/[0.07] px-5 py-4 sm:px-6">
            <p className="text-[15px] text-fg">Total <strong className="ml-2 font-mono font-semibold tabular">{total === null ? '–' : `USD ${total}`}</strong>{total === null && <span className="ml-2 text-[12px] text-fg-dim">Complete every field to see it</span>}</p>
            <div className="flex gap-2">
              {selected && <Button variant="ghost" icon={RotateCcw} disabled={busy} onClick={() => { if (canDiscard()) void run(async () => replace(await api<Detail>(`/${selected.id}`))) }}>Reload saved</Button>}
              <Button type="submit" variant="primary" disabled={busy || !parsed.success || (!!selected && !dirty)}>{busy ? 'Working…' : 'Save invoice'}</Button>
            </div>
          </div>
        </Panel>

        {selected && <Panel aria-label="Payment and PDF history">
          <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              <div><span aria-hidden="true" className={label}>Payment status</span>
                <Select aria-label="Payment status" disabled={busy} value={selected.paymentStatus} onChange={e => void run(async () => {
                  await api(`/${selected.id}/payment`, 'PATCH', { status: e.target.value, version: selected.paymentVersion })
                  const record = await api<Detail>(`/${selected.id}`); setSelected(record); await refresh(); setNotice('Payment status recorded. Existing PDFs are unchanged.')
                })}><option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="unknown">Unknown</option></Select>
              </div>
              <p className="mt-1.5 text-[12px] text-fg-dim">Nothing is charged or verified automatically.</p>
              {selected.paymentEvents?.length ? <details className="mt-3 text-[12px]"><summary className="cursor-pointer text-fg-dim hover:text-fg-soft">History</summary><ul className="mt-2 space-y-1">{selected.paymentEvents.map(e => <li key={e.version} className="flex justify-between gap-3"><span className="text-fg-soft">{payment[e.status].label}</span><span className="font-mono text-fg-dim">{formatDateTime(e.changedAt)}</span></li>)}</ul></details> : null}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-fg">PDF versions</h3>
                  <p className="mt-0.5 text-[13px] text-fg-dim">Signed with your signature image. Save edits before exporting.</p>
                </div>
                <Button variant="primary" disabled={busy || dirty} onClick={() => void run(async () => {
                  const record = exported
                    ? await api<Detail>(`/${selected.id}`, 'PUT', { revision: selected.revision, invoice: selected.invoice })
                    : selected
                  // Keep the successful revision even if rendering fails, so retrying is safe.
                  replace(record)
                  await api(`/${record.id}/exports`, 'POST', { revision: record.revision })
                  replace(await api<Detail>(`/${record.id}`)); await refresh(); setNotice('PDF with your signature image saved. Download the latest revision below.')
                })}>{exported ? 'Export new PDF version' : 'Export saved revision'}</Button>
              </div>
              {!selected.exports.length && <p className="mt-4 text-[13px] text-fg-dim">No PDF exported yet.</p>}
              <ul className="mt-4 divide-y divide-line/[0.07] rounded-2xl border border-line/10">{selected.exports.map(version => <li key={version.revision} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-[13px]">
                <a className="inline-flex items-center gap-1.5 font-medium text-fg hover:underline" href={`/api/admin/invoices/${selected.id}/exports/${version.revision}`}><Download size={14} strokeWidth={1.75} aria-hidden="true" />Download PDF · revision {version.revision}</a>
                <span className="font-mono text-[11px] text-fg-dim">{formatDateTime(version.createdAt)}</span>
                <details className="w-full text-[11px] text-fg-dim"><summary className="inline-flex cursor-pointer items-center gap-1"><ShieldCheck size={12} aria-hidden="true" />Integrity checksum</summary><code className="mt-1 block break-all font-mono">{version.sha256}</code></details>
              </li>)}</ul>
            </div>
          </div>
        </Panel>}
      </div>
    </div>
  </section>
}
