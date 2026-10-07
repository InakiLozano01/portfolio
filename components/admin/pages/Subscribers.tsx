'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Archive, Download, Users } from 'lucide-react'
import { Button, Empty, ErrorNote, PageHeader, Panel, SearchField, Segmented, SkeletonRows, Status, formatDate } from '../console/kit'
import { api, errorMessage, useConfirm, useResource } from '../console/data'

interface Subscriber {
  _id: string
  email: string
  language?: 'en' | 'es'
  unsubscribed?: boolean
  confirmed?: boolean
  confirmedAt?: string
  createdAt: string
}

type State = 'active' | 'pending' | 'left'
const stateOf = (s: Subscriber): State => (s.unsubscribed ? 'left' : s.confirmed ? 'active' : 'pending')

/** Who receives the newsletter. Sign-ups are double opt-in, so only confirmed addresses get posts. */
export default function Subscribers() {
  const { data, error, loading, reload } = useResource<Subscriber[]>('/api/subscribers')
  const confirm = useConfirm()
  const [filter, setFilter] = useState<State | 'all'>('active')
  const [query, setQuery] = useState('')
  const [sending, setSending] = useState(false)
  const all = useMemo(() => data || [], [data])
  const count = (state: State) => all.filter((s) => stateOf(s) === state).length
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((s) => (filter === 'all' || stateOf(s) === filter) && (!q || s.email.toLowerCase().includes(q)))
  }, [all, filter, query])

  const exportCsv = () => {
    const rows = [['email', 'language', 'status', 'joined'], ...shown.map((s) => [s.email, s.language || '', stateOf(s), new Date(s.createdAt).toISOString()])]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/^[=+\-@\t\r]/, "'$&").replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: `subscribers-${new Date().toISOString().slice(0, 10)}.csv` })
    link.click()
    URL.revokeObjectURL(url)
  }

  const sendArchive = async () => {
    const ok = await confirm({
      title: 'Send the archive to yourself?',
      body: 'Every published post goes, one email each, to the archive address set on the server (NEWSLETTER_ALWAYS_TO). Subscribers receive nothing.',
      confirmLabel: 'Send archive',
      tone: 'primary',
    })
    if (!ok) return
    setSending(true)
    try {
      const result = await api<{ blogs: number; sent: number; failed: unknown[] }>('/api/admin/newsletter/send-archive', { method: 'POST', body: {} })
      toast.success(`Sent ${result.sent} of ${result.blogs} posts${result.failed.length ? `, ${result.failed.length} failed` : ''}`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Subscribers"
        description="Newsletter sign-ups. Addresses confirm by email before they receive anything, and every email carries a one-click unsubscribe."
        actions={
          <>
            <Button icon={Archive} loading={sending} onClick={sendArchive}>Send archive to me</Button>
            <Button icon={Download} disabled={!shown.length} onClick={exportCsv}>Export CSV</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          label="Status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'active', label: 'Confirmed', count: count('active') },
            { value: 'pending', label: 'Awaiting confirmation', count: count('pending') },
            { value: 'left', label: 'Unsubscribed', count: count('left') },
            { value: 'all', label: 'All', count: all.length },
          ]}
        />
        <SearchField value={query} onChange={setQuery} placeholder="Search addresses" className="min-w-[180px] flex-1" />
      </div>
      {error && !data ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : (
        <Panel className="overflow-hidden">
          {loading && !data ? (
            <SkeletonRows rows={6} />
          ) : shown.length === 0 ? (
            <Empty icon={Users} title={query ? 'No addresses match' : 'No subscribers here yet'}>
              Readers subscribe from the writing section and the end of every post.
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-line/[0.07] text-[12px] text-fg-dim">
                    <th scope="col" className="px-6 py-2.5 font-medium">Address</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Language</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-6 py-2.5 text-right font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/[0.07]">
                  {shown.map((s) => {
                    const state = stateOf(s)
                    return (
                      <tr key={s._id}>
                        <td className="max-w-[320px] truncate px-6 py-3 text-fg">{s.email}</td>
                        <td className="px-3 py-3 font-mono text-[12px] uppercase text-fg-soft">{s.language || '–'}</td>
                        <td className="px-3 py-3">
                          <Status tone={state === 'active' ? 'live' : state === 'pending' ? 'idle' : 'muted'}>
                            {state === 'active' ? 'Confirmed' : state === 'pending' ? 'Awaiting confirmation' : 'Unsubscribed'}
                          </Status>
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-[12px] tabular text-fg-dim">{formatDate(s.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </>
  )
}
