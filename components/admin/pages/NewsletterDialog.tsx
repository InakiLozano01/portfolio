'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Send, X } from 'lucide-react'
import { buildNewsletterEmail } from '@/lib/blog-newsletter'
import { Button, ErrorNote, IconButton, SearchField, SkeletonRows, cx } from '../console/kit'
import { api, errorMessage } from '../console/data'
import { LangSwitch, type Lang } from '../console/editing'

interface Subscriber { _id: string; email: string; language?: Lang; unsubscribed?: boolean; confirmed?: boolean }

const MAX = 100

/** Pick recipients and see exactly what they will receive, in their language, before anything is sent. */
export default function NewsletterDialog({ postId, onClose }: { postId: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const [post, setPost] = useState<Record<string, any> | null>(null)
  const [subscribers, setSubscribers] = useState<Subscriber[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [previewLang, setPreviewLang] = useState<Lang>('en')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
    Promise.all([api(`/api/blogs/${postId}`), api<Subscriber[]>('/api/subscribers')])
      .then(([blog, subs]) => {
        // Only confirmed, subscribed addresses can receive it; the server enforces the same rule.
        const eligible = subs.filter((s) => s.confirmed && !s.unsubscribed)
        setPost(blog)
        setSubscribers(eligible)
        setSelected(new Set(eligible.slice(0, MAX).map((s) => s._id)))
      })
      .catch((err) => setError(errorMessage(err)))
  }, [postId])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (subscribers || []).filter((s) => !q || s.email.toLowerCase().includes(q))
  }, [subscribers, query])

  const preview = useMemo(() => (post ? buildNewsletterEmail(post, { email: 'reader@example.com', language: previewLang }) : null), [post, previewLang])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX) next.add(id)
      return next
    })

  const send = async () => {
    setSending(true)
    try {
      const result = await api<{ sent: number; failed: string[] }>(`/api/blogs/${postId}/send-newsletter`, { method: 'POST', body: { subscriberIds: [...selected] } })
      if (result.failed?.length) toast.error(`Sent ${result.sent}; ${result.failed.length} failed: ${result.failed.slice(0, 3).join(', ')}`)
      else toast.success(`Sent to ${result.sent} ${result.sent === 1 ? 'reader' : 'readers'}`)
      onClose()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="newsletter-title"
      className="field-cream m-auto h-[min(760px,calc(100dvh-32px))] w-[min(1080px,calc(100vw-24px))] max-w-none rounded-3xl border border-line/10 p-0 text-fg backdrop:bg-navy/50"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-line/[0.08] px-6 py-4">
          <div className="min-w-0">
            <h2 id="newsletter-title" className="text-lg font-semibold tracking-[-0.02em]">Email this post</h2>
            {post && <p className="truncate text-[13px] text-fg-dim">{post.title_en || post.title}</p>}
          </div>
          <IconButton label="Close" icon={X} onClick={onClose} />
        </div>

        {error ? (
          <div className="p-6"><ErrorNote message={error} /></div>
        ) : (
          <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col border-b border-line/[0.08] md:border-b-0 md:border-r">
              <div className="space-y-3 p-4">
                <SearchField value={query} onChange={setQuery} placeholder="Filter recipients" />
                <div className="flex items-center justify-between text-[12px] text-fg-dim">
                  <span><span className="font-mono tabular text-fg">{selected.size}</span> of {subscribers?.length ?? 0} confirmed{selected.size >= MAX ? ` (max ${MAX} per send)` : ''}</span>
                  <span className="flex gap-1">
                    <button type="button" className="rounded-md px-1.5 py-0.5 hover:text-fg" onClick={() => setSelected(new Set(shown.slice(0, MAX).map((s) => s._id)))}>All</button>
                    <button type="button" className="rounded-md px-1.5 py-0.5 hover:text-fg" onClick={() => setSelected(new Set())}>None</button>
                  </span>
                </div>
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                {!subscribers ? (
                  <SkeletonRows rows={5} />
                ) : shown.length === 0 ? (
                  <li className="px-3 py-8 text-center text-[13px] text-fg-dim">{subscribers.length ? 'No address matches.' : 'No confirmed subscribers yet.'}</li>
                ) : (
                  shown.map((s) => (
                    <li key={s._id}>
                      <label className={cx('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-[13px] hover:bg-fg/[0.04]', selected.has(s._id) ? 'text-fg' : 'text-fg-dim')}>
                        <input type="checkbox" checked={selected.has(s._id)} onChange={() => toggle(s._id)} className="h-4 w-4 accent-[#1a2433]" />
                        <span className="min-w-0 flex-1 truncate">{s.email}</span>
                        <span className="font-mono text-[10px] uppercase">{s.language || 'en'}</span>
                      </label>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="flex min-h-0 flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <p className="min-w-0 truncate text-[13px] text-fg-soft">
                  <span className="text-fg-dim">Subject:</span> {preview?.subject}
                </p>
                <LangSwitch value={previewLang} onChange={setPreviewLang} />
              </div>
              {/* The email renders in a sandboxed frame: no scripts, and its styles stay inside. */}
              <iframe title="Email preview" sandbox="" srcDoc={preview?.html || ''} className="min-h-[280px] w-full flex-1 border-t border-line/[0.08] bg-white" />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line/[0.08] px-6 py-4">
          <p className="mr-auto text-[12px] text-fg-dim">Each reader gets it in their language, with a one-click unsubscribe.</p>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Send} loading={sending} disabled={!selected.size || !post} onClick={send}>
            Send to {selected.size} {selected.size === 1 ? 'reader' : 'readers'}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
