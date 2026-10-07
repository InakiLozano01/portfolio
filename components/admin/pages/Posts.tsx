'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ArrowUpRight, PenLine, Plus } from 'lucide-react'
import { Empty, ErrorNote, LinkButton, PageHeader, Panel, SearchField, Segmented, SkeletonRows, Status, TimeAgo } from '../console/kit'
import { useResource } from '../console/data'

export interface PostSummary {
  _id: string
  title?: string
  title_en?: string
  title_es?: string
  subtitle_en?: string
  slug?: string
  tags?: string[]
  published?: boolean
  createdAt: string
  updatedAt?: string
}

/** Every essay in one ruled list: status, languages and last edit at a glance; the row opens the editor. */
export default function Posts() {
  const params = useSearchParams()
  const { data, error, loading, reload } = useResource<PostSummary[]>('/api/blogs?view=summary')
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>((params.get('status') as 'draft') || 'all')
  const [query, setQuery] = useState('')
  const posts = useMemo(() => data || [], [data])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return posts.filter(
      (p) =>
        (filter === 'all' || (filter === 'published' ? p.published : !p.published)) &&
        (!q || `${p.title_en || p.title || ''} ${p.title_es || ''} ${p.subtitle_en || ''} ${(p.tags || []).join(' ')}`.toLowerCase().includes(q)),
    )
  }, [posts, filter, query])
  const published = posts.filter((p) => p.published).length

  return (
    <>
      <PageHeader
        title="Writing"
        description="Bilingual essays. Publishing a post for the first time also emails it to confirmed subscribers."
        actions={<LinkButton href="/admin/posts/new" variant="primary" icon={Plus}>New post</LinkButton>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          label="Status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: posts.length },
            { value: 'published', label: 'Published', count: published },
            { value: 'draft', label: 'Drafts', count: posts.length - published },
          ]}
        />
        <SearchField value={query} onChange={setQuery} placeholder="Search titles and tags" className="min-w-[180px] flex-1" />
      </div>
      {error && !data ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : (
        <Panel className="overflow-hidden">
          {loading && !data ? (
            <SkeletonRows rows={6} />
          ) : shown.length === 0 ? (
            <Empty
              icon={PenLine}
              title={query ? 'No posts match' : filter === 'draft' ? 'No drafts' : 'Nothing written yet'}
              action={!query && <LinkButton href="/admin/posts/new" variant="primary" icon={Plus}>Start a post</LinkButton>}
            >
              {query ? 'Try another word from the title or a tag.' : 'Write in English and Spanish side by side; Spanish falls back to English until you translate it.'}
            </Empty>
          ) : (
            <ul className="divide-y divide-line/[0.07]">
              {shown.map((post) => {
                const title = post.title_en || post.title || 'Untitled'
                return (
                  <li key={post._id} className="group relative flex items-center gap-4 px-5 py-4 transition-colors hover:bg-fg/[0.03] sm:px-6">
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/posts/${post._id}`} className="block truncate text-[15px] font-semibold tracking-[-0.01em] text-fg after:absolute after:inset-0">
                        {title}
                      </Link>
                      <p className="mt-0.5 truncate text-[13px] text-fg-dim">
                        {post.title_es && post.title_es !== title ? post.title_es : post.subtitle_en || ' '}
                      </p>
                      {!!post.tags?.length && (
                        <div className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
                          {post.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="rounded-full bg-fg/[0.05] px-2 py-0.5 text-[11px] text-fg-soft">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Status tone={post.published ? 'live' : 'idle'}>{post.published ? 'Published' : 'Draft'}</Status>
                      <TimeAgo value={post.updatedAt || post.createdAt} />
                    </div>
                    {post.published && post.slug && (
                      <a
                        href={`/en/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View “${title}” on the site`}
                        className="relative z-10 hidden h-9 w-9 shrink-0 place-items-center rounded-full text-fg-dim transition-colors hover:bg-fg/[0.07] hover:text-fg sm:grid"
                      >
                        <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" />
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      )}
    </>
  )
}
