'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Copy, Inbox as InboxIcon, Mail, MailOpen, Reply, Trash2 } from 'lucide-react'
import { Button, Empty, ErrorNote, IconButton, PageHeader, Panel, SearchField, Segmented, SkeletonRows, TimeAgo, cx, formatDateTime, useCopy } from '../console/kit'
import { api, errorMessage, useConfirm, useResource } from '../console/data'
import { useStats } from '../console/Shell'

interface Message {
  _id: string
  name: string
  email: string
  message: string
  ipAddress?: string
  read?: boolean
  createdAt: string
}

/** Contact messages as an inbox: a list on the left, the open message on the right, reply by email. */
export default function Inbox() {
  const router = useRouter()
  const params = useSearchParams()
  const openId = params.get('m')
  const { data, error, loading, reload, mutate } = useResource<Message[]>('/api/messages')
  const { refresh } = useStats()
  const confirm = useConfirm()
  const { copied, copy } = useCopy()
  const [filter, setFilter] = useState<'unread' | 'all'>('all')
  const [query, setQuery] = useState('')

  const messages = useMemo(() => data || [], [data])
  const unread = messages.filter((m) => !m.read).length
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return messages.filter((m) => (filter === 'unread' ? !m.read : true) && (!q || `${m.name} ${m.email} ${m.message}`.toLowerCase().includes(q)))
  }, [messages, filter, query])
  const open = messages.find((m) => m._id === openId) || null

  const select = (id: string | null) => router.replace(id ? `/admin/inbox?m=${id}` : '/admin/inbox', { scroll: false })

  const setRead = async (message: Message, read: boolean, quiet = false) => {
    mutate((prev) => prev?.map((m) => (m._id === message._id ? { ...m, read } : m)) || prev)
    try {
      await api(`/api/messages/${message._id}`, { method: 'PATCH', body: { read } })
      refresh()
    } catch (err) {
      mutate((prev) => prev?.map((m) => (m._id === message._id ? { ...m, read: !read } : m)) || prev)
      if (!quiet) toast.error(errorMessage(err))
    }
  }

  // Opening an unread message marks it read.
  useEffect(() => {
    if (open && !open.read) setRead(open, true, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?._id])

  // j / k move through the list.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)
      if (typing || event.metaKey || event.ctrlKey || !shown.length) return
      if (event.key !== 'j' && event.key !== 'k') return
      const index = shown.findIndex((m) => m._id === openId)
      const next = event.key === 'j' ? Math.min(shown.length - 1, index + 1) : Math.max(0, index - 1)
      select(shown[next]._id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const remove = async (message: Message) => {
    const ok = await confirm({ title: 'Delete this message?', body: `The message from ${message.name} is removed for good.` })
    if (!ok) return
    try {
      await api(`/api/messages/${message._id}`, { method: 'DELETE' })
      mutate((prev) => prev?.filter((m) => m._id !== message._id) || prev)
      select(null)
      refresh()
      toast.success('Message deleted')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <>
      <PageHeader title="Inbox" description="Messages sent from the contact form. Reply by email; delete what you no longer need." />
      {error && !data ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <div className={cx('min-w-0', open && 'hidden lg:block')}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Segmented
                label="Show"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'All', count: messages.length },
                  { value: 'unread', label: 'Unread', count: unread },
                ]}
              />
              <SearchField value={query} onChange={setQuery} placeholder="Search messages" className="min-w-[160px] flex-1" />
            </div>
            <Panel className="overflow-hidden">
              {loading && !data ? (
                <SkeletonRows rows={6} />
              ) : shown.length === 0 ? (
                <Empty icon={InboxIcon} title={query ? 'No messages match' : filter === 'unread' ? 'No unread messages' : 'The inbox is empty'}>
                  {query ? 'Try another name, address or phrase.' : 'New messages from the contact form appear here.'}
                </Empty>
              ) : (
                <ul className="max-h-[calc(100dvh-260px)] divide-y divide-line/[0.07] overflow-y-auto">
                  {shown.map((message) => {
                    const active = message._id === openId
                    return (
                      <li key={message._id}>
                        <button
                          type="button"
                          onClick={() => select(message._id)}
                          aria-current={active ? 'true' : undefined}
                          className={cx('flex w-full gap-3 px-5 py-3.5 text-left transition-colors', active ? 'bg-navy text-cream' : 'hover:bg-fg/[0.03]')}
                        >
                          <span aria-hidden="true" className={cx('mt-2 h-2 w-2 shrink-0 rounded-full', message.read ? (active ? 'border border-cream/40' : 'border border-fg/30') : 'bg-signal')} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-3">
                              <span className={cx('truncate text-[14px]', !message.read && 'font-semibold', active ? 'text-cream' : message.read ? 'text-fg-soft' : 'text-fg')}>{message.name}</span>
                              <TimeAgo value={message.createdAt} className={active ? '!text-cream/60' : ''} />
                            </span>
                            <span className={cx('mt-0.5 block truncate text-[13px]', active ? 'text-cream/70' : 'text-fg-dim')}>{message.message}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>
          </div>

          <div className={cx('min-w-0', !open && 'hidden lg:block')}>
            {open ? (
              <Panel as="div" className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/[0.07] px-4 py-2.5 sm:px-5">
                  <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => select(null)} className="lg:hidden">
                    Inbox
                  </Button>
                  <div className="ml-auto flex items-center gap-1">
                    <IconButton label={open.read ? 'Mark as unread' : 'Mark as read'} icon={open.read ? Mail : MailOpen} onClick={() => setRead(open, !open.read)} />
                    <IconButton label={copied ? 'Copied' : 'Copy email address'} icon={Copy} onClick={() => copy(open.email)} />
                    <IconButton label="Delete message" icon={Trash2} onClick={() => remove(open)} className="hover:!text-signal-text" />
                  </div>
                </div>
                <article className="px-5 py-6 sm:px-8 sm:py-8">
                  <header className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold tracking-[-0.02em] text-fg">{open.name}</h2>
                      <a href={`mailto:${open.email}`} className="mt-0.5 block break-all text-[14px] text-fg-soft underline decoration-line/25 underline-offset-4 hover:decoration-signal">
                        {open.email}
                      </a>
                    </div>
                    <time dateTime={open.createdAt} className="font-mono text-[12px] tabular text-fg-dim">
                      {formatDateTime(open.createdAt)}
                    </time>
                  </header>
                  <p className="mt-6 max-w-[68ch] whitespace-pre-wrap break-words text-[15px] leading-[1.75] text-fg">{open.message}</p>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <a
                      href={`mailto:${open.email}?subject=${encodeURIComponent('Re: your message')}&body=${encodeURIComponent(`\n\n> ${open.message.split('\n').join('\n> ')}`)}`}
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-action px-4 text-sm font-medium text-action-fg transition-colors hover:bg-navy"
                    >
                      <Reply size={15} strokeWidth={1.75} aria-hidden="true" />
                      Reply by email
                    </a>
                    {open.ipAddress && <span className="font-mono text-[11px] text-fg-dim">from {open.ipAddress}</span>}
                  </div>
                </article>
              </Panel>
            ) : (
              <Panel as="div" className="hidden lg:block">
                <Empty icon={MailOpen} title="Select a message">
                  Pick one from the list, or move with <kbd className="font-mono">j</kbd> and <kbd className="font-mono">k</kbd>.
                </Empty>
              </Panel>
            )}
          </div>
        </div>
      )}
    </>
  )
}
