'use client'

import { useEffect, useMemo, useState } from 'react'

interface Comment {
  _id: string
  alias: string
  content: string
  createdAt: string
}

export default function BlogComments({ blogId }: { blogId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [alias, setAlias] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isValid = useMemo(() => alias.trim().length >= 2 && content.trim().length >= 3, [alias, content])

  useEffect(() => {
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
      const res = await fetch(`/api/blogs/${blogId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: alias.trim(), content: content.trim() })
      })
      if (res.ok) {
        const comment = await res.json()
        setComments([comment, ...comments])
        setContent('')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to send comment')
      }
    } catch (e) {
      setError('Failed to send comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mt-12">
      <h3 className="text-2xl font-semibold mb-4">Comments</h3>
      <div className="space-y-4 mb-8">
        {comments.map(c => (
          <div key={c._id} className="border p-3 rounded">
            <p className="text-sm text-muted-foreground">
              {c.alias} • {new Date(c.createdAt).toLocaleString()}
            </p>
            <p className="whitespace-pre-wrap">{c.content}</p>
          </div>
        ))}
        {comments.length === 0 && <p>No comments yet.</p>}
      </div>
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Your alias"
          value={alias}
          onChange={e => setAlias(e.target.value)}
          className="w-full p-2 border rounded text-black"
        />
        <textarea
          placeholder="Your comment"
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full p-2 border rounded h-24 text-black"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={submit}
          disabled={!isValid || isSubmitting}
          aria-disabled={!isValid || isSubmitting}
          className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </button>
      </div>
    </div>
  )
}
