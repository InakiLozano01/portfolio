'use client'

import { useEffect, useMemo, useState } from 'react'

interface Comment {
  _id: string
  alias: string
  content: string
  createdAt: string
  parent?: string | null
  votes?: { ip: string; value: number }[]
  isOfficial?: boolean
}

type CommentNode = Comment & { children: CommentNode[] }

function buildTree(list: Comment[]): CommentNode[] {
  const nodes: Record<string, CommentNode> = {}
  list.forEach(c => { (nodes as any)[c._id] = { ...c, children: [] } })
  const roots: CommentNode[] = []
  list.forEach(c => {
    if (c.parent && nodes[c.parent]) nodes[c.parent].children.push(nodes[c._id])
    else roots.push(nodes[c._id])
  })
  return roots
}

export default function BlogComments({ blogId, lang = 'en', dict = {} }: { blogId: string; lang?: 'en' | 'es'; dict?: any }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [alias, setAlias] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [posted, setPosted] = useState('')
  const tree = useMemo(() => buildTree(comments), [comments])
  const isValid = useMemo(() => alias.trim().length >= 2 && content.trim().length >= 3, [alias, content])

  useEffect(() => {
    if (!blogId) return
    const load = async () => {
      const res = await fetch(`/api/blogs/${blogId}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data)
      }
    }
    load()
  }, [blogId])

  const submit = async () => {
    setError('')
    if (!isValid) return
    setIsSubmitting(true)
    try {
      if (!blogId) {
        setError(dict?.errorMissingBlog || 'Missing blog reference')
        return
      }
      const res = await fetch(`/api/blogs/${blogId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: alias.trim(), content: content.trim(), parentId: replyTo })
      })
      if (res.ok) {
        const comment = await res.json()
        if (comment.status === 'approved') setComments([comment, ...comments])
        setContent('')
        setReplyTo(null)
        setPosted(comment.status === 'pending'
          ? (lang === 'es' ? 'Comentario recibido. Está pendiente de revisión.' : 'Comment received. Awaiting review.')
          : comment.status === 'rejected'
            ? (lang === 'es' ? 'El comentario no fue publicado por moderación. Un administrador puede revisar la decisión.' : 'The comment was not published by moderation. An administrator can review the decision.')
            : dict?.posted || 'Comment posted')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || dict?.errorSend || 'Failed to send comment')
      }
    } catch (e) {
      setError(dict?.errorSend || 'Failed to send comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const vote = async (id: string, dir: 'up' | 'down') => {
    try {
      if (!blogId) return
      const res = await fetch(`/api/comments/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: dir })
      })
      if (res.ok) {
        // Refresh comments to reflect counts
        const r = await fetch(`/api/blogs/${blogId}/comments`)
        if (r.ok) setComments(await r.json())
      }
    } catch { }
  }

  const renderNode = (n: CommentNode, depth = 0) => {
    const up = n.votes?.filter(v => v.value === 1).length || 0
    const down = n.votes?.filter(v => v.value === -1).length || 0
    return (
      <div
        key={n._id}
        className={`p-3 rounded border ${n.isOfficial ? 'border-l-2 border-l-[#800020] bg-[#800020]/[0.04]' : ''}`}
        style={{ marginLeft: depth * 16 }}
      >
        <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={n.isOfficial ? 'font-semibold text-foreground' : ''}>{n.alias}</span>
          {n.isOfficial && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#800020] px-2 py-0.5 text-[11px] font-semibold leading-none text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {dict?.authorBadge || 'Author'}
            </span>
          )}
          <span>• {new Date(n.createdAt).toLocaleString(lang)}</span>
        </p>
        <p className="whitespace-pre-wrap mb-2">{n.content}</p>
        <div className="flex items-center gap-3 text-sm">
          <button onClick={() => vote(n._id, 'up')} className="text-primary hover:underline" aria-label={dict?.upvote || 'Upvote'}>▲ {up}</button>
          <button onClick={() => vote(n._id, 'down')} className="text-primary hover:underline" aria-label={dict?.downvote || 'Downvote'}>▼ {down}</button>
          <button onClick={() => setReplyTo(n._id)} className="text-primary hover:underline" aria-label={dict?.reply || 'Reply'}>{dict?.reply || 'Reply'}</button>
        </div>
        {replyTo === n._id && (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              placeholder={dict?.aliasPlaceholder || 'Your alias'}
              aria-label={dict?.aliasPlaceholder || 'Your alias'}
              value={alias}
              onChange={e => setAlias(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
            <textarea
              placeholder={dict?.replyPlaceholder || 'Your reply'}
              aria-label={dict?.replyPlaceholder || 'Your reply'}
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
            <div className="flex gap-2">
              <button onClick={submit} disabled={!isValid || isSubmitting} className="h-9 px-4 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50">{isSubmitting ? (dict?.posting || 'Posting...') : (dict?.reply || 'Reply')}</button>
              <button onClick={() => { setReplyTo(null); setContent('') }} className="h-9 px-4 rounded-md border text-sm">{dict?.cancel || 'Cancel'}</button>
            </div>
          </div>
        )}
        {n.children.length > 0 && (
          <div className="mt-3 space-y-3">
            {n.children.map(c => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-12">
      <h3 className="text-2xl font-semibold mb-4">{dict?.heading || 'Comments'}</h3>
      <div className="space-y-4 mb-8">
        {tree.map(node => renderNode(node))}
        {tree.length === 0 && <p>{dict?.empty || 'No comments yet.'}</p>}
      </div>
      <div className="space-y-2">
        <input
          type="text"
          placeholder={dict?.aliasPlaceholder || 'Your alias'}
              aria-label={dict?.aliasPlaceholder || 'Your alias'}
          value={alias}
          onChange={e => setAlias(e.target.value)}
          className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        />
        <textarea
          placeholder={dict?.commentPlaceholder || 'Your comment'}
          aria-label={dict?.commentPlaceholder || 'Your comment'}
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        />
        <div role="alert" aria-live="assertive">{error && <p className="text-red-500 text-sm">{error}</p>}</div>
        <p className="sr-only" role="status" aria-live="polite">{posted}</p>
        <button
          onClick={submit}
          disabled={!isValid || isSubmitting}
          aria-disabled={!isValid || isSubmitting}
          className="h-10 px-4 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (dict?.posting || 'Posting...') : (dict?.post || 'Post Comment')}
        </button>
      </div>
    </div>
  )
}
