'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, ExternalLink, FileBox, KeyRound, RotateCcw, Share2, Trash2, Users } from 'lucide-react'
import {
  Button, Empty, ErrorNote, Field, IconButton, Input, LinkButton, PageHeader, Panel, PanelHeader, Select, SkeletonRows, Status, Switch, TimeAgo, formatDateTime, useCopy,
} from '../console/kit'
import { api, errorMessage, useConfirm, useResource } from '../console/data'
import ArtifactShareDialog from './ArtifactShareDialog'

const API = '/api/admin/artifacts'
type Kind = 'restricted' | 'link' | 'password'
interface Summary {
  id: number; slug: string; title: string; url: string; version: number
  access: { kind: Kind; role: string }; shareCount: number; responseCount: number; storageBytes: number; updatedAt: string
  responses: { who: 'anonymous' | 'declared' | 'account'; open: boolean; feedback: 'none' | 'score' | 'answers'; notifyOwner: boolean }
}
interface Detail extends Summary {
  versions: { version: number; note: string | null; createdBy: string; createdAt: string }[]
  files: { path: string; size: number; contentType: string; video: 'pending' | 'ready' | 'failed' | null }[]
  hasAnswerKey: boolean
}
interface Response { id: number; name: string | null; email: string | null; alias: string | null; identity: string; score: number | null; maxScore: number | null; submittedAt: string; updatedAt: string; answers: Record<string, unknown> }
interface Token { id: number; name: string; limited: boolean; createdAt: string; lastUsedAt: string | null; revokedAt: string | null }
interface Account { id: number; email: string; alias: string | null; hasPassword: boolean; shares: { slug: string; title: string; role: string }[] }

const ACCESS_LABEL: Record<Kind, string> = { restricted: 'Restricted', link: 'Anyone with the link', password: 'Shared password' }
export const bytes = (n: number) => (n < 1024 ? `${n} B` : n < 1 << 20 ? `${(n / 1024).toFixed(0)} KB` : n < 1 << 30 ? `${(n / 2 ** 20).toFixed(1)} MB` : `${(n / 2 ** 30).toFixed(2)} GB`)

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  URL.revokeObjectURL(url)
}

/** Every artifact with who can reach it, what it collected and what it stores; plus the people and the agents' tokens. */
export default function Artifacts() {
  const { data, error, loading, reload } = useResource<Summary[]>(`${API}/artifacts`)
  const storage = useResource<{ usedBytes: number; capBytes: number }>(`${API}/storage`)
  const [open, setOpen] = useState<string | null>(null)
  const [sharing, setSharing] = useState<string | null>(null)

  return (
    <>
      <PageHeader
        title="Artifacts"
        description={<>HTML pages at artifacts.inakilozano.com, never indexed. {storage.data && <span className="font-mono tabular">{bytes(storage.data.usedBytes)} of {bytes(storage.data.capBytes)} used.</span>}</>}
      />
      {error && !data ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : (
        <Panel className="overflow-hidden">
          {loading && !data ? (
            <SkeletonRows rows={5} />
          ) : !data?.length ? (
            <Empty icon={FileBox} title="No artifacts yet">Agents publish them with the artifacts CLI or MCP tools.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-line/[0.07] text-[12px] text-fg-dim">
                    <th scope="col" className="px-6 py-2.5 font-medium">Artifact</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">General access</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Shares</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Responses</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Storage</th>
                    <th scope="col" className="px-6 py-2.5 text-right font-medium"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/[0.07]">
                  {data.map((a) => (
                    <tr key={a.id} className={open === a.slug ? 'bg-fg/[0.03]' : undefined}>
                      <td className="max-w-[300px] px-6 py-3">
                        <button type="button" className="block max-w-full truncate text-left font-medium text-fg hover:underline" aria-expanded={open === a.slug} onClick={() => setOpen(open === a.slug ? null : a.slug)}>
                          {a.title}
                        </button>
                        <span className="font-mono text-[12px] text-fg-dim">/{a.slug} · v{a.version} · <TimeAgo value={a.updatedAt} /></span>
                      </td>
                      <td className="px-3 py-3"><Status tone={a.access.kind === 'restricted' ? 'muted' : 'live'}>{ACCESS_LABEL[a.access.kind]}{a.access.kind !== 'restricted' ? ` · ${a.access.role}` : ''}</Status></td>
                      <td className="px-3 py-3 text-right font-mono tabular">{a.shareCount}</td>
                      <td className="px-3 py-3 text-right font-mono tabular">{a.responseCount}</td>
                      <td className="px-3 py-3 text-right font-mono text-[12px] tabular text-fg-soft">{bytes(a.storageBytes)}</td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-1">
                          <IconButton size="sm" label={`Share ${a.title}`} icon={Share2} onClick={() => setSharing(a.slug)} />
                          <a href={a.url} target="_blank" rel="noreferrer" aria-label={`Open ${a.title}`} title="Open" className="grid h-8 w-8 place-items-center rounded-full text-fg-soft hover:bg-fg/[0.07] hover:text-fg">
                            <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
      {open && <ArtifactDetail key={open} slug={open} onChanged={(slug) => { reload(); storage.reload(); setOpen(slug) }} onShare={() => setSharing(open)} />}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AccountsPanel />
        <TokensPanel />
      </div>
      {sharing && <ArtifactShareDialog artifact={sharing} apiBase={API} onClose={() => { setSharing(null); reload() }} />}
    </>
  )
}

function ArtifactDetail({ slug, onChanged, onShare }: { slug: string; onChanged: (slug: string | null) => void; onShare: () => void }) {
  const { data: a, error, reload } = useResource<Detail>(`${API}/artifacts/${slug}`)
  const responses = useResource<Response[]>(`${API}/artifacts/${slug}/responses`)
  const confirm = useConfirm()
  const [names, setNames] = useState<{ title: string; slug: string } | null>(null)
  const base = `${API}/artifacts/${slug}`
  if (error) return <div className="mt-6"><ErrorNote message={error} onRetry={reload} /></div>
  if (!a) return <Panel className="mt-6"><SkeletonRows rows={4} /></Panel>
  const form = names ?? { title: a.title, slug: a.slug }

  const act = async (fn: () => Promise<unknown>, ok: string, next: string | null = slug) => {
    try {
      await fn()
      toast.success(ok)
      onChanged(next)
      reload()
      responses.reload()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const settings = (patch: Partial<Summary['responses']>) => act(() => api(base, { method: 'PATCH', body: { responses: patch } }), 'Response settings saved')

  return (
    <div className="mt-6 space-y-6">
      <Panel>
        <PanelHeader
          title={a.title}
          description={<span className="font-mono">{a.url}</span>}
          actions={<>
            <Button size="sm" icon={Share2} onClick={onShare}>Share</Button>
            <LinkButton size="sm" href={a.url} target="_blank" rel="noreferrer" icon={ExternalLink}>Open</LinkButton>
          </>}
        />
        <form
          className="grid gap-3 px-6 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          onSubmit={(e) => { e.preventDefault(); act(() => api(base, { method: 'PATCH', body: form }), 'Saved', form.slug).then(() => setNames(null)) }}
        >
          <Field label="Title">{(p) => <Input {...p} value={form.title} onChange={(e) => setNames({ ...form, title: e.target.value })} />}</Field>
          <Field label="Slug" hint={form.slug !== a.slug ? 'Links with the old slug stop working.' : undefined}>{(p) => <Input {...p} value={form.slug} onChange={(e) => setNames({ ...form, slug: e.target.value })} />}</Field>
          <div className="flex items-end gap-2">
            <Button type="submit" variant="primary" disabled={!names}>Save</Button>
            <Button variant="danger" icon={Trash2} onClick={async () => {
              if (await confirm({ title: `Delete ${a.title}?`, body: 'Its versions, files, state, shares and responses are deleted. This cannot be undone.' }))
                act(() => api(base, { method: 'DELETE' }), 'Artifact deleted', null)
            }}>Delete</Button>
          </div>
        </form>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Versions" description="Rolling back publishes a copy of the old version as the newest one." />
          <ul className="max-h-[320px] divide-y divide-line/[0.07] overflow-y-auto">
            {a.versions.map((v) => (
              <li key={v.version} className="flex items-center gap-3 px-6 py-2.5 text-[13px]">
                <span className="w-10 font-mono tabular text-fg">v{v.version}</span>
                <span className="min-w-0 flex-1 truncate text-fg-soft">{v.note || '—'} <span className="text-fg-dim">· {v.createdBy} · {formatDateTime(v.createdAt)}</span></span>
                {v.version === a.version ? <Status tone="live">Current</Status> : (
                  <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => act(() => api(`${base}/rollback`, { method: 'POST', body: { version: v.version } }), `Rolled back to v${v.version}`)}>Roll back</Button>
                )}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <PanelHeader title="Files" description={<span className="font-mono tabular">{bytes(a.storageBytes)} stored across all versions</span>} />
          <ul className="max-h-[320px] divide-y divide-line/[0.07] overflow-y-auto">
            {a.files.map((f) => (
              <li key={f.path} className="flex items-center gap-3 px-6 py-2.5 text-[13px]">
                <span className="min-w-0 flex-1 truncate font-mono text-fg">{f.path}</span>
                {f.video && <Status tone={f.video === 'ready' ? 'live' : f.video === 'failed' ? 'attention' : 'idle'}>{f.video === 'pending' ? 'Encoding' : f.video === 'ready' ? 'Video ready' : 'Encoding failed'}</Status>}
                <span className="font-mono text-[12px] tabular text-fg-dim">{bytes(f.size)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Responses"
          description={a.hasAnswerKey ? 'Graded against the answer key.' : 'No answer key, so responses are not graded.'}
          actions={<>
            <Button size="sm" icon={Download} disabled={!responses.data?.length} onClick={async () => download(`${a.slug}-responses.csv`, await (await fetch(`${base}/responses?format=csv`)).text(), 'text/csv')}>CSV</Button>
            <Button size="sm" icon={Download} disabled={!responses.data?.length} onClick={() => download(`${a.slug}-responses.json`, JSON.stringify(responses.data, null, 2), 'application/json')}>JSON</Button>
          </>}
        />
        <div className="grid gap-4 border-b border-line/[0.07] px-6 py-4 sm:grid-cols-2">
          <Field label="Who can respond">
            {(p) => (
              <Select {...p} value={a.responses.who} onChange={(e) => settings({ who: e.target.value as Summary['responses']['who'] })}>
                <option value="account">Signed-in accounts only</option>
                <option value="declared">Anyone who gives a name or email</option>
                <option value="anonymous">Anyone, anonymously</option>
              </Select>
            )}
          </Field>
          <Field label="After submitting, they see">
            {(p) => (
              <Select {...p} value={a.responses.feedback} onChange={(e) => settings({ feedback: e.target.value as Summary['responses']['feedback'] })}>
                <option value="none">Nothing</option>
                <option value="score">Their score</option>
                <option value="answers">Their score and the correct answers</option>
              </Select>
            )}
          </Field>
          <Switch checked={a.responses.open} onChange={(open) => settings({ open })} label="Accepting responses" description="Closed responses can be read but not changed." />
          <Switch checked={a.responses.notifyOwner} onChange={(notifyOwner) => settings({ notifyOwner })} label="Email me each new response" />
        </div>
        {!responses.data?.length ? (
          <p className="px-6 py-6 text-center text-[13px] text-fg-dim">No responses yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line/[0.07] text-[12px] text-fg-dim">
                  <th scope="col" className="px-6 py-2 font-medium">From</th>
                  <th scope="col" className="px-3 py-2 font-medium">Submitted</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Score</th>
                  <th scope="col" className="px-6 py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/[0.07]">
                {responses.data.map((r) => (
                  <tr key={r.id}>
                    <td className="max-w-[260px] px-6 py-2.5">
                      <details>
                        <summary className="cursor-pointer truncate text-fg">{r.alias || r.name || r.email || (r.identity === 'owner' ? 'You' : 'Anonymous')}{r.email && (r.alias || r.name) ? <span className="text-fg-dim"> · {r.email}</span> : null}</summary>
                        <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-fg/[0.04] p-2 font-mono text-[12px]">{JSON.stringify(r.answers, null, 2)}</pre>
                      </details>
                    </td>
                    <td className="px-3 py-2.5 text-fg-dim">{formatDateTime(r.updatedAt)}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular">{r.score == null ? '—' : `${r.score}/${r.maxScore}`}</td>
                    <td className="px-6 py-2.5 text-right">
                      <IconButton size="sm" label="Delete response" icon={Trash2} onClick={async () => {
                        if (await confirm({ title: 'Delete this response?' })) act(() => api(`${base}/responses/${r.id}`, { method: 'DELETE' }), 'Response deleted')
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

function AccountsPanel() {
  const { data, reload } = useResource<Account[]>(`${API}/accounts`)
  const confirm = useConfirm()
  const [revealed, setRevealed] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: number; alias: string } | null>(null)
  const act = async (fn: () => Promise<any>, ok: string) => {
    try {
      const r = await fn()
      if (r?.password) setRevealed(r.password)
      toast.success(ok)
      reload()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  return (
    <Panel>
      <PanelHeader title="People" description="One account per email, across every artifact shared with it." />
      {revealed && <p role="status" className="mx-6 mt-4 rounded-xl bg-signal/8 px-3 py-2 font-mono text-[13px]">New password (shown once): {revealed}</p>}
      {!data?.length ? (
        <Empty icon={Users} title="Nobody yet">Share an artifact to create an account.</Empty>
      ) : (
        <ul className="max-h-[360px] divide-y divide-line/[0.07] overflow-y-auto">
          {data.map((acct) => editing?.id === acct.id ? (
            <li key={acct.id} className="px-6 py-2.5 text-[13px]">
              <form className="flex items-center gap-2" onSubmit={(e) => {
                e.preventDefault()
                act(() => api(`${API}/accounts/${acct.id}`, { method: 'PATCH', body: { alias: editing.alias } }), 'Name saved').then(() => setEditing(null))
              }} onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null) }}>
                <Input aria-label={`Name to show for ${acct.email}`} className="!h-8 min-w-0 flex-1" autoFocus maxLength={80} value={editing.alias} onChange={(e) => setEditing({ ...editing, alias: e.target.value })} />
                <Button size="sm" type="submit" variant="primary" aria-label="Save name">Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              </form>
            </li>
          ) : (
            <li key={acct.id} className="flex items-center gap-2 px-6 py-2.5 text-[13px]">
              <div className="min-w-0 flex-1">
                <p className="truncate text-fg">{acct.alias ? `${acct.alias} · ` : ''}{acct.email}</p>
                <p className="truncate text-[12px] text-fg-dim">{acct.shares.map((s) => `${s.title} (${s.role})`).join(', ') || 'No shares'}</p>
              </div>
              <IconButton size="sm" label={`Rename ${acct.email}`} icon={Users} onClick={() => setEditing({ id: acct.id, alias: acct.alias || '' })} />
              <IconButton size="sm" label={`Reset password for ${acct.email}`} icon={KeyRound} onClick={async () => {
                if (await confirm({ title: `Reset ${acct.email}'s password?`, body: 'Their sessions end now and they get an email to choose a new password.', confirmLabel: 'Reset', tone: 'primary' }))
                  act(() => api(`${API}/accounts/${acct.id}/reset`, { method: 'POST', body: { notify: true } }), 'Reset email sent')
              }} />
              <IconButton size="sm" label={`Delete ${acct.email}`} icon={Trash2} onClick={async () => {
                if (await confirm({ title: `Delete ${acct.email}?`, body: 'They lose access to every artifact at once.' })) act(() => api(`${API}/accounts/${acct.id}`, { method: 'DELETE' }), 'Account deleted')
              }} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function TokensPanel() {
  const { data, reload } = useResource<Token[]>(`${API}/tokens`)
  const confirm = useConfirm()
  const { copy } = useCopy()
  const [name, setName] = useState('')
  const [limited, setLimited] = useState(false)
  const [created, setCreated] = useState<{ name: string; token: string } | null>(null)
  return (
    <Panel>
      <PanelHeader title="API tokens" description="For the artifacts CLI and MCP endpoint. A token is shown once." />
      <form className="flex items-end gap-2 px-6 pt-4" onSubmit={async (e) => {
        e.preventDefault()
        try {
          setCreated(await api(`${API}/tokens`, { method: 'POST', body: { name, limited } }))
          setName('')
          reload()
        } catch (err) {
          toast.error(errorMessage(err))
        }
      }}>
        <Field label="Name" className="flex-1">{(p) => <Input {...p} value={name} pattern="[A-Za-z0-9_.\-]{1,64}" placeholder="laptop-cli" onChange={(e) => setName(e.target.value)} />}</Field>
        <label className="flex h-9 items-center gap-2 text-[13px] text-fg-dim" title="Only reaches the restricted artifacts it creates; cannot share, open or delete them.">
          <input type="checkbox" checked={limited} onChange={(e) => setLimited(e.target.checked)} />
          Limited
        </label>
        <Button type="submit" icon={KeyRound} disabled={!name}>Create</Button>
      </form>
      {created && (
        <div role="status" className="mx-6 mt-3 flex items-center gap-2 rounded-xl bg-signal/8 px-3 py-2 text-[13px]">
          <code className="min-w-0 flex-1 truncate font-mono">{created.token}</code>
          <Button size="sm" onClick={() => copy(created.token).then(() => toast.success('Token copied'))}>Copy</Button>
        </div>
      )}
      <ul className="mt-3 max-h-[300px] divide-y divide-line/[0.07] overflow-y-auto">
        {(data || []).map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-6 py-2.5 text-[13px]">
            <span className="min-w-0 flex-1 truncate font-mono text-fg">{t.name}{t.limited && <span className="ml-2 font-sans text-[12px] text-fg-dim">limited</span>}</span>
            <span className="text-[12px] text-fg-dim">{t.revokedAt ? 'Revoked' : t.lastUsedAt ? <>Used <TimeAgo value={t.lastUsedAt} /></> : 'Never used'}</span>
            {!t.revokedAt && <Button size="sm" variant="ghost" onClick={async () => {
              if (await confirm({ title: `Revoke ${t.name}?`, body: 'Agents using it stop working at once.', confirmLabel: 'Revoke' })) {
                await api(`${API}/tokens/${t.id}`, { method: 'DELETE' }).catch((e) => toast.error(errorMessage(e)))
                reload()
              }
            }}>Revoke</Button>}
          </li>
        ))}
      </ul>
    </Panel>
  )
}
