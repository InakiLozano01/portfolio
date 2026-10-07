'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Check, CornerDownRight, MessageSquare, Reply, RotateCcw, Trash2, X } from 'lucide-react'
import { Button, Empty, ErrorNote, PageHeader, Panel, SearchField, Segmented, Select, SkeletonRows, Status, Textarea, TimeAgo, cx } from '../console/kit'
import { api, errorMessage, useConfirm, useResource } from '../console/data'
import { useStats } from '../console/Shell'

type CommentStatus = 'pending' | 'approved' | 'rejected'

interface Comment {
  _id: string
  blog: { _id: string; title?: string; title_en?: string; slug?: string } | null
  alias: string
  content: string
  status: CommentStatus
  isOfficial: boolean
  moderation?: { decision: string; source: string; confidence: number; categories?: Record<string, number>; reasons?: string[] }
  overrides?: { status: string; actor: string; at: string }[]
  parent?: string | null
  createdAt: string
}

const PAGE = 20
const statusLabel: Record<CommentStatus, string> = { pending: 'Needs review', approved: 'Approved', rejected: 'Rejected' }

/** Moderation as a queue: what needs review comes first, decisions are one click, and several at once. */
export default function Comments() {
  const params = useSearchParams()
  const { data, error, loading, reload, mutate } = useResource<Comment[]>('/api/admin/comments')
  const { refresh } = useStats()
  const confirm = useConfirm()
  const comments = useMemo(() => data || [], [data])
  const counts = useMemo(() => ({
    pending: comments.filter((c) => c.status === 'pending').length,
    approved: comments.filter((c) => c.status === 'approved').length,
    rejected: comments.filter((c) => c.status === 'rejected').length,
  }), [comments])
  const [filter, setFilter] = useState<CommentStatus | 'all'>((params.get('status') as CommentStatus) || 'pending')
  const [post, setPost] = useState('')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [replying, setReplying] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)

  const posts = useMemo(() => {
    const map = new Map<string, string>()
    comments.forEach((c) => c.blog && map.set(c.blog._id, c.blog.title_en || c.blog.title || 'Untitled'))
    return [...map.entries()]
  }, [comments])
  const byId = useMemo(() => new Map(comments.map((c) => [c._id, c])), [comments])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return comments.filter((c) => (filter === 'all' || c.status === filter) && (!post || c.blog?._id === post) && (!q || `${c.alias} ${c.content}`.toLowerCase().includes(q)))
  }, [comments, filter, post, query])
  const visible = shown.slice(0, limit)

  const setStatus = async (ids: string[], status: CommentStatus) => {
    setBusy(true)
    const previous = new Map(ids.map((id) => [id, byId.get(id)?.status]))
    mutate((prev) => prev?.map((c) => (ids.includes(c._id) ? { ...c, status } : c)) || prev)
    const results = await Promise.allSettled(ids.map((id) => api(`/api/admin/comments/${id}`, { method: 'PATCH', body: { status } })))
    const failed = ids.filter((_, i) => results[i].status === 'rejected')
    if (failed.length) {
      mutate((prev) => prev?.map((c) => (failed.includes(c._id) ? { ...c, status: previous.get(c._id) || c.status } : c)) || prev)
      toast.error(`${failed.length} of ${ids.length} could not be updated`)
    } else if (ids.length > 1) toast.success(`${ids.length} comments ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'sent back to review'}`)
    setSelected(new Set())
    setBusy(false)
    refresh()
  }

  const remove = async (comment: Comment) => {
    const replies = comments.filter((c) => c.parent === comment._id).length
    const ok = await confirm({
      title: 'Delete this comment?',
      body: replies ? `Its ${replies} ${replies === 1 ? 'reply goes' : 'replies go'} with it. This cannot be undone.` : 'This cannot be undone.',
    })
    if (!ok) return
    try {
      await api(`/api/admin/comments/${comment._id}`, { method: 'DELETE' })
      reload()
      refresh()
      toast.success('Comment deleted')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const sendReply = async (comment: Comment) => {
    if (!reply.trim() || !comment.blog) return
    setBusy(true)
    try {
      await api('/api/admin/comments', { method: 'POST', body: { blogId: comment.blog._id, parentId: comment._id, content: reply.trim() } })
      if (comment.status === 'pending') await api(`/api/admin/comments/${comment._id}`, { method: 'PATCH', body: { status: 'approved' } })
      setReply('')
      setReplying(null)
      reload()
      refresh()
      toast.success(comment.status === 'pending' ? 'Reply published and comment approved' : 'Reply published')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const allVisibleSelected = visible.length > 0 && visible.every((c) => selected.has(c._id))

  return (
    <>
      <PageHeader title="Comments" description="Reader comments on your posts. The moderation model screens each one; you make the call." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          label="Status"
          value={filter}
          onChange={(value) => { setFilter(value); setLimit(PAGE); setSelected(new Set()) }}
          options={[
            { value: 'pending', label: 'Needs review', count: counts.pending },
            { value: 'approved', label: 'Approved', count: counts.approved },
            { value: 'rejected', label: 'Rejected', count: counts.rejected },
            { value: 'all', label: 'All', count: comments.length },
          ]}
        />
        {posts.length > 1 && (
          <Select aria-label="Post" value={post} onChange={(event) => setPost(event.target.value)} className="w-auto max-w-[260px] rounded-full">
            <option value="">All posts</option>
            {posts.map(([id, title]) => (
              <option key={id} value={id}>{title}</option>
            ))}
          </Select>
        )}
        <SearchField value={query} onChange={setQuery} placeholder="Search comments" className="min-w-[180px] flex-1" />
      </div>

      {selected.size > 0 && (
        <div className="sticky top-16 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-navy px-4 py-2.5 text-[14px] text-cream lg:top-4">
          <span className="mr-auto font-medium"><span className="font-mono tabular">{selected.size}</span> selected</span>
          <button type="button" disabled={busy} onClick={() => setStatus([...selected], 'approved')} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-cream px-3 text-[13px] font-medium text-navy hover:bg-coral disabled:opacity-50">
            <Check size={14} strokeWidth={2} aria-hidden="true" /> Approve
          </button>
          <button type="button" disabled={busy} onClick={() => setStatus([...selected], 'rejected')} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-cream/25 px-3 text-[13px] font-medium hover:border-cream/60 disabled:opacity-50">
            <X size={14} strokeWidth={2} aria-hidden="true" /> Reject
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="h-8 rounded-full px-3 text-[13px] text-[#c3c9d3] hover:text-cream">Clear</button>
        </div>
      )}

      {error && !data ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : (
        <Panel className="overflow-hidden">
          {visible.length > 0 && (
            <label className="flex items-center gap-3 border-b border-line/[0.07] px-5 py-2.5 text-[13px] text-fg-dim sm:px-6">
              <input type="checkbox" checked={allVisibleSelected} onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(visible.map((c) => c._id)))} className="h-4 w-4 accent-[#1a2433]" />
              Select all shown
            </label>
          )}
          {loading && !data ? (
            <SkeletonRows rows={5} />
          ) : visible.length === 0 ? (
            <Empty icon={MessageSquare} title={filter === 'pending' && !query ? 'Nothing to review' : 'No comments here'}>
              {filter === 'pending' && !query ? 'New comments the model is unsure about wait here for you.' : 'Try another filter or search.'}
            </Empty>
          ) : (
            <ul className="divide-y divide-line/[0.07]">
              {visible.map((comment) => {
                const parent = comment.parent ? byId.get(comment.parent) : null
                const last = comment.overrides?.[comment.overrides.length - 1]
                return (
                  <li key={comment._id} className={cx('flex gap-3 px-5 py-5 sm:px-6', selected.has(comment._id) && 'bg-fg/[0.03]')}>
                    <input type="checkbox" aria-label={`Select comment by ${comment.alias}`} checked={selected.has(comment._id)} onChange={() => toggle(comment._id)} className="mt-1 h-4 w-4 shrink-0 accent-[#1a2433]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <p className="text-[14px] font-semibold text-fg">{comment.alias}</p>
                        {comment.isOfficial && <span className="rounded-full bg-navy px-2 py-px text-[11px] font-medium text-cream">You</span>}
                        {comment.blog && (
                          <p className="min-w-0 truncate text-[13px] text-fg-dim">
                            on <Link href={`/admin/posts/${comment.blog._id}`} className="text-fg-soft hover:text-fg hover:underline">{comment.blog.title_en || comment.blog.title}</Link>
                          </p>
                        )}
                        <TimeAgo value={comment.createdAt} className="ml-auto" />
                      </div>
                      {parent && (
                        <p className="mt-1.5 flex items-center gap-1.5 truncate text-[12px] text-fg-dim">
                          <CornerDownRight size={12} strokeWidth={1.75} aria-hidden="true" /> replying to {parent.alias}: “{parent.content.slice(0, 80)}”
                        </p>
                      )}
                      <p className="mt-2 max-w-[72ch] whitespace-pre-wrap break-words text-[14px] leading-relaxed text-fg">{comment.content}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <Status tone={comment.status === 'pending' ? 'attention' : comment.status === 'approved' ? 'live' : 'muted'}>{statusLabel[comment.status]}</Status>
                        {comment.moderation && (
                          <details className="group text-[12px] text-fg-dim">
                            <summary className="cursor-pointer list-none rounded-md hover:text-fg-soft">
                              {comment.moderation.source === 'jev' ? 'Model' : 'Fallback'}: {comment.moderation.decision} · <span className="font-mono tabular">{Math.round((comment.moderation.confidence || 0) * 100)}%</span>
                            </summary>
                            <div className="mt-2 space-y-1 rounded-xl bg-fg/[0.04] px-3 py-2">
                              {!!comment.moderation.reasons?.length && <p>{comment.moderation.reasons.join(', ').replaceAll('_', ' ')}</p>}
                              {comment.moderation.categories && (
                                <p className="font-mono">
                                  {Object.entries(comment.moderation.categories).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(' · ')}
                                </p>
                              )}
                            </div>
                          </details>
                        )}
                        {last && <span className="text-[12px] text-fg-dim">{last.status} by {last.actor.split('@')[0]} <TimeAgo value={last.at} /></span>}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {comment.status !== 'approved' && <Button size="sm" variant={comment.status === 'pending' ? 'primary' : 'secondary'} icon={Check} disabled={busy} onClick={() => setStatus([comment._id], 'approved')}>Approve</Button>}
                        {comment.status !== 'rejected' && <Button size="sm" icon={X} disabled={busy} onClick={() => setStatus([comment._id], 'rejected')}>Reject</Button>}
                        {comment.status !== 'pending' && <Button size="sm" variant="ghost" icon={RotateCcw} disabled={busy} onClick={() => setStatus([comment._id], 'pending')}>Back to review</Button>}
                        {comment.blog && !comment.isOfficial && <Button size="sm" variant="ghost" icon={Reply} onClick={() => { setReplying(replying === comment._id ? null : comment._id); setReply('') }}>Reply</Button>}
                        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(comment)} className="hover:!text-signal-text">Delete</Button>
                      </div>

                      {replying === comment._id && (
                        <div className="mt-3 max-w-[72ch]">
                          <Textarea autoFocus aria-label={`Reply to ${comment.alias}`} value={reply} onChange={(event) => setReply(event.target.value.slice(0, 5000))} placeholder="Your public reply" rows={3} />
                          <div className="mt-2 flex items-center gap-2">
                            <Button size="sm" variant="primary" loading={busy} disabled={!reply.trim()} onClick={() => sendReply(comment)}>
                              {comment.status === 'pending' ? 'Approve and reply' : 'Publish reply'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setReplying(null)}>Cancel</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {shown.length > visible.length && (
            <div className="border-t border-line/[0.07] px-6 py-3 text-center">
              <Button size="sm" variant="ghost" onClick={() => setLimit((n) => n + PAGE)}>
                Show more <span className="font-mono text-[11px] text-fg-dim">{shown.length - visible.length}</span>
              </Button>
            </div>
          )}
        </Panel>
      )}
    </>
  )
}
