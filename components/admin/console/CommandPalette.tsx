'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Command } from 'cmdk'
import { signOut } from 'next-auth/react'
import { ArrowUpRight, CornerDownLeft, FileText, FolderKanban, LogOut, Plus, Search } from 'lucide-react'
import { api } from './data'
import { ALL_NAV } from './nav'

interface Entry {
  _id: string
  title?: string
  title_en?: string
  title_es?: string
}

const itemClass =
  'flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-[14px] text-fg-soft data-[selected=true]:bg-navy data-[selected=true]:text-cream'

/** ⌘K: jump to any page, start anything new, or open a post or project by title. */
export default function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const [query, setQuery] = useState('')
  const [posts, setPosts] = useState<Entry[]>([])
  const [projects, setProjects] = useState<Entry[]>([])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      setQuery('')
      requestAnimationFrame(() => dialog.querySelector<HTMLInputElement>('[cmdk-input]')?.focus())
      api<Entry[]>('/api/blogs?view=summary').then(setPosts).catch(() => {})
      api<Entry[]>('/api/projects?view=summary').then(setProjects).catch(() => {})
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  const go = (href: string) => {
    onOpenChange(false)
    // Already on invoices: the page is mounted, so ask it to start a new one instead of navigating.
    if (href === '/admin/invoices?new=1' && window.location.pathname === '/admin/invoices') window.dispatchEvent(new Event('admin-new-invoice'))
    else router.push(href)
  }
  const title = (entry: Entry) => entry.title_en || entry.title || entry.title_es || 'Untitled'

  return (
    <dialog
      ref={dialogRef}
      onClose={() => onOpenChange(false)}
      onClick={(event) => event.target === dialogRef.current && onOpenChange(false)}
      aria-label="Command palette"
      className="field-cream mx-auto mt-[12vh] w-[min(620px,calc(100vw-24px))] rounded-3xl border border-line/10 p-0 text-fg backdrop:bg-navy/50 backdrop:backdrop-blur-[2px]"
    >
      <Command label="Command palette" loop className="flex max-h-[min(560px,70vh)] flex-col">
        <div className="flex items-center gap-3 border-b border-line/[0.08] px-5">
          <Search size={17} strokeWidth={1.75} className="text-fg-dim" aria-hidden="true" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search pages, posts, projects, or type an action"
            className="h-14 flex-1 bg-transparent text-[15px] text-fg placeholder:text-fg-dim focus:outline-none"
          />
        </div>
        <Command.List className="overflow-y-auto p-2">
          <Command.Empty className="px-3 py-10 text-center text-sm text-fg-dim">Nothing matches “{query}”.</Command.Empty>
          <Command.Group heading="Create" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-fg-dim">
            {[
              { label: 'New post', href: '/admin/posts/new' },
              { label: 'New project', href: '/admin/projects/new' },
              { label: 'New invoice', href: '/admin/invoices?new=1' },
            ].map((action) => (
              <Command.Item key={action.href} value={`create ${action.label}`} onSelect={() => go(action.href)} className={itemClass}>
                <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
                <span className="flex-1">{action.label}</span>
                <CornerDownLeft size={14} strokeWidth={1.75} className="opacity-50" aria-hidden="true" />
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-fg-dim">
            {ALL_NAV.map((item) => (
              <Command.Item key={item.href} value={`${item.label} ${item.keywords || ''}`} onSelect={() => go(item.href)} className={itemClass}>
                <item.icon size={16} strokeWidth={1.75} aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
              </Command.Item>
            ))}
            <Command.Item value="view live site public" onSelect={() => { onOpenChange(false); window.open('/en', '_blank', 'noopener') }} className={itemClass}>
              <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" />
              <span className="flex-1">View site</span>
            </Command.Item>
          </Command.Group>
          {query.length > 0 && (
            <>
              <Command.Group heading="Posts" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-fg-dim">
                {posts.map((post) => (
                  <Command.Item key={post._id} value={`post ${title(post)} ${post.title_es || ''} ${post._id}`} onSelect={() => go(`/admin/posts/${post._id}`)} className={itemClass}>
                    <FileText size={16} strokeWidth={1.75} aria-hidden="true" />
                    <span className="flex-1 truncate">{title(post)}</span>
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Projects" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-fg-dim">
                {projects.map((project) => (
                  <Command.Item key={project._id} value={`project ${title(project)} ${project.title_es || ''} ${project._id}`} onSelect={() => go(`/admin/projects/${project._id}`)} className={itemClass}>
                    <FolderKanban size={16} strokeWidth={1.75} aria-hidden="true" />
                    <span className="flex-1 truncate">{title(project)}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            </>
          )}
          <Command.Item value="sign out log out" onSelect={() => signOut({ callbackUrl: '/admin/login' })} className={itemClass}>
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
            <span className="flex-1">Sign out</span>
          </Command.Item>
        </Command.List>
        <div className="flex items-center gap-4 border-t border-line/[0.08] px-5 py-2.5 font-mono text-[11px] text-fg-dim">
          <span>↑↓ move</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </Command>
    </dialog>
  )
}
