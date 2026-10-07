'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowUpRight, FolderKanban, Plus } from 'lucide-react'
import { Empty, ErrorNote, LinkButton, PageHeader, Panel, SearchField, SkeletonRows, TimeAgo } from '../console/kit'
import { useResource } from '../console/data'

interface ProjectSummary {
  _id: string
  title?: string
  title_en?: string
  title_es?: string
  subtitle?: string
  subtitle_en?: string
  slug?: string
  thumbnail?: string
  thumbnailSmall?: string
  technologies?: { _id: string; name: string }[]
  publicUrl?: string
  updatedAt?: string
  createdAt?: string
}

/** The work, as it appears on the site: cover, title, stack. The row opens the editor. */
export default function Projects() {
  const { data, error, loading, reload } = useResource<ProjectSummary[]>('/api/projects?view=summary')
  const [query, setQuery] = useState('')
  const projects = useMemo(() => data || [], [data])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects.filter((p) => !q || `${p.title || ''} ${p.title_es || ''} ${p.subtitle_en || p.subtitle || ''} ${(p.technologies || []).map((t) => t.name).join(' ')}`.toLowerCase().includes(q))
  }, [projects, query])

  return (
    <>
      <PageHeader
        title="Projects"
        description="Case studies on the site, in the order the site shows them."
        actions={<LinkButton href="/admin/projects/new" variant="primary" icon={Plus}>New project</LinkButton>}
      />
      {projects.length > 4 && <SearchField value={query} onChange={setQuery} placeholder="Search projects or technologies" className="mb-4" />}
      {error && !data ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : (
        <Panel className="overflow-hidden">
          {loading && !data ? (
            <SkeletonRows rows={5} />
          ) : shown.length === 0 ? (
            <Empty icon={FolderKanban} title={query ? 'No projects match' : 'No projects yet'} action={!query && <LinkButton href="/admin/projects/new" variant="primary" icon={Plus}>Add a project</LinkButton>}>
              {query ? 'Try a title or a technology.' : 'Each project gets a card on the home page and its own case-study page.'}
            </Empty>
          ) : (
            <ul className="divide-y divide-line/[0.07]">
              {shown.map((project) => {
                const title = project.title_en || project.title || 'Untitled'
                const cover = project.thumbnailSmall || project.thumbnail
                return (
                  <li key={project._id} className="group relative flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-fg/[0.03] sm:px-5">
                    <div className="relative aspect-[16/10] w-24 shrink-0 overflow-hidden rounded-lg bg-fg/[0.05] sm:w-32">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {cover && <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/projects/${project._id}`} className="block truncate text-[15px] font-semibold tracking-[-0.01em] text-fg after:absolute after:inset-0">
                        {title}
                      </Link>
                      <p className="mt-0.5 line-clamp-1 text-[13px] text-fg-dim">{project.subtitle_en || project.subtitle}</p>
                      {!!project.technologies?.length && (
                        <p className="mt-1.5 hidden truncate font-mono text-[11px] text-fg-dim sm:block">{project.technologies.map((t) => t.name).join(' · ')}</p>
                      )}
                    </div>
                    <TimeAgo value={project.updatedAt || project.createdAt} className="hidden shrink-0 md:block" />
                    {project.slug && (
                      <a
                        href={`/en/projects/${project.slug}`}
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
