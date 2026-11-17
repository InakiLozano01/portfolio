'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Copy, KeyRound, Mail, Trash2, UserPlus, X } from 'lucide-react'
import { Button, ErrorNote, Field, IconButton, Input, Select, SkeletonRows, useCopy } from '../console/kit'
import { api, errorMessage, useConfirm } from '../console/data'

type Role = 'viewer' | 'responder' | 'editor'
type Kind = 'restricted' | 'link' | 'password'
interface Share { accountId: number; email: string; alias: string | null; role: Role; hasPassword: boolean }
interface Detail { id: number; slug: string; title: string; url: string; access: { kind: Kind; role: Role; hasPassword: boolean }; shares: Share[] }

const ROLES: { value: Role; label: string }[] = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'responder', label: 'Responder' },
  { value: 'editor', label: 'Editor' },
]
const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: 'restricted', label: 'Restricted', hint: 'Only you and the people below can open it.' },
  { value: 'link', label: 'Anyone with the link', hint: 'No sign-in needed.' },
  { value: 'password', label: 'Anyone with the shared password', hint: 'One password, no account.' },
]

/**
 * General access on top, people and roles below. `apiBase` is /api/admin/artifacts in the console and /api/v1 on the
 * artifacts origin, where the owner opens it from the Share button on the artifact.
 */
export default function ArtifactShareDialog({ artifact, apiBase, onClose }: { artifact: string; apiBase: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [revealed, setRevealed] = useState<{ label: string; value: string } | null>(null)
  const [add, setAdd] = useState({ email: '', role: 'viewer' as Role, alias: '', notify: true })
  const confirm = useConfirm()
  const { copy } = useCopy()
  const copyWithToast = (text: string, message: string) => copy(text).then(() => toast.success(message))
  const base = `${apiBase}/artifacts/${encodeURIComponent(artifact)}`

  const load = () => api<Detail>(base).then(setDetail).catch((e) => setError(errorMessage(e)))
  useEffect(() => {
    dialogRef.current?.showModal()
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base])

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key)
    try {
      await fn()
      if (ok) toast.success(ok)
      await load()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const setAccess = (body: Record<string, unknown>, ok = 'General access updated') =>
    run('access', async () => {
      const r = await api<{ password?: string }>(`${base}/access`, { method: 'PUT', body })
      if (r.password) setRevealed({ label: 'Shared password (shown once)', value: r.password })
    }, ok)

  const share = (body: Record<string, unknown>, ok: string) =>
    run(`share:${body.email}`, async () => {
      const r = await api<{ password?: string; email: string }>(`${base}/shares`, { method: 'PUT', body })
      if (r.password) setRevealed({ label: `Password for ${r.email} (shown once)`, value: r.password })
    }, ok)

  const remove = async (s: Share) => {
    const ok = await confirm({ title: `Remove ${s.alias || s.email}?`, body: 'They lose access to this artifact at once. Their account stays.', confirmLabel: 'Remove' })
    if (ok) run(`share:${s.email}`, () => api(`${base}/shares/${s.accountId}`, { method: 'DELETE' }), 'Share removed')
  }

  const kind = detail?.access.kind
  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="share-title"
      className="field-cream m-auto w-[min(620px,calc(100vw-24px))] max-w-none rounded-3xl border border-line/10 p-0 text-fg backdrop:bg-navy/50"
    >
      <div className="flex items-center justify-between gap-4 border-b border-line/8 px-6 py-4">
        <div className="min-w-0">
          <h2 id="share-title" className="text-lg font-semibold tracking-[-0.02em]">Share</h2>
          {detail && <p className="truncate text-[13px] text-fg-dim">{detail.title}</p>}
        </div>
        <div className="flex items-center gap-1">
          {detail && <Button size="sm" variant="ghost" icon={Copy} onClick={() => copyWithToast(detail.url, 'Link copied')}>Copy link</Button>}
          {/* Closing the native dialog (not unmounting it) lets the browser return focus to the button that opened it. */}
          <IconButton label="Close" icon={X} onClick={() => dialogRef.current?.close()} />
        </div>
      </div>

      {error ? (
        <div className="p-6"><ErrorNote message={error} /></div>
      ) : !detail ? (
        <div className="p-6"><SkeletonRows rows={4} /></div>
      ) : (
        <div className="max-h-[calc(100dvh-180px)] space-y-6 overflow-y-auto px-6 py-5">
          {revealed && (
            <div role="status" className="rounded-2xl border border-signal/40 bg-signal/8 p-4 text-[13px]">
              <p className="font-medium">{revealed.label}</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-3 py-2 font-mono">{revealed.value}</code>
                <Button size="sm" icon={Copy} onClick={() => copyWithToast(revealed.value, 'Copied')}>Copy</Button>
                <IconButton size="sm" label="Dismiss" icon={X} onClick={() => setRevealed(null)} />
              </div>
            </div>
          )}

          <section aria-labelledby="general-access">
            <h3 id="general-access" className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-fg-dim">General access</h3>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
              <Field label="Who can open it" hint={KINDS.find((k) => k.value === kind)?.hint}>
                {(p) => (
                  <Select {...p} value={kind} disabled={busy === 'access'} onChange={(e) => {
                    const next = e.target.value as Kind
                    if (next === 'password' && !detail.access.hasPassword) setAccess({ kind: next, generatePassword: true })
                    else setAccess({ kind: next })
                  }}>
                    {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="They can">
                {(p) => (
                  <Select {...p} value={detail.access.role} disabled={kind === 'restricted' || busy === 'access'} onChange={(e) => setAccess({ role: e.target.value })}>
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </Select>
                )}
              </Field>
            </div>
            {kind === 'password' && (
              <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); setAccess({ password }, 'Shared password changed'); setPassword('') }}>
                <Field label="New shared password" className="min-w-[200px] flex-1" hint="Changing it signs out everyone who used the old one.">
                  {(p) => <Input {...p} type="text" autoComplete="off" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />}
                </Field>
                <Button type="submit" disabled={password.length < 8} loading={busy === 'access'}>Set</Button>
                <Button icon={KeyRound} onClick={() => setAccess({ generatePassword: true }, 'New shared password')}>Generate</Button>
              </form>
            )}
          </section>

          <section aria-labelledby="people">
            <h3 id="people" className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-fg-dim">People</h3>
            <form
              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_130px_auto]"
              onSubmit={(e) => {
                e.preventDefault()
                share({ email: add.email, role: add.role, alias: add.alias || undefined, notify: add.notify }, add.notify ? 'Shared, invitation sent' : 'Shared')
                setAdd({ ...add, email: '', alias: '' })
              }}
            >
              <Field label="Email">{(p) => <Input {...p} type="email" required value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} />}</Field>
              <Field label="Role">
                {(p) => (
                  <Select {...p} value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value as Role })}>
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </Select>
                )}
              </Field>
              <div className="flex items-end"><Button type="submit" variant="primary" icon={UserPlus} disabled={!add.email}>Share</Button></div>
              <Field label="Name to show (optional)" className="sm:col-span-2">{(p) => <Input {...p} value={add.alias} onChange={(e) => setAdd({ ...add, alias: e.target.value })} />}</Field>
              <label className="flex items-end gap-2 pb-2.5 text-[13px] text-fg-soft">
                <input type="checkbox" checked={add.notify} onChange={(e) => setAdd({ ...add, notify: e.target.checked })} className="h-4 w-4 accent-[#1a2433]" />
                Send invitation
              </label>
            </form>
            <ul className="mt-4 divide-y divide-line/[0.07] rounded-2xl border border-line/10">
              {detail.shares.length === 0 && <li className="px-4 py-5 text-center text-[13px] text-fg-dim">Not shared with anyone yet.</li>}
              {detail.shares.map((s) => (
                <li key={s.accountId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] text-fg">{s.alias || s.email}</p>
                    <p className="truncate text-[12px] text-fg-dim">{s.alias ? s.email : ''}{s.hasPassword ? '' : `${s.alias ? ' · ' : ''}invitation pending`}</p>
                  </div>
                  <Select aria-label={`Role for ${s.email}`} className="!h-8 w-[130px] text-[13px]" value={s.role} disabled={busy === `share:${s.email}`}
                    onChange={(e) => share({ email: s.email, role: e.target.value }, 'Role changed')}>
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </Select>
                  <IconButton size="sm" label={`Resend invitation to ${s.email}`} icon={Mail} onClick={() => run(`share:${s.email}`, () => api(`${base}/shares/${s.accountId}/resend`, { method: 'POST' }), 'Invitation sent')} />
                  <IconButton size="sm" label={`Remove ${s.email}`} icon={Trash2} onClick={() => remove(s)} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </dialog>
  )
}
