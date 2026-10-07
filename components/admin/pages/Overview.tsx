'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Inbox, MessageSquare, PenLine, Plus } from 'lucide-react'
import { LinkButton, PageHeader, Panel, PanelHeader, SkeletonRows, Status, TimeAgo, cx } from '../console/kit'
import { useResource } from '../console/data'
import { useStats } from '../console/Shell'

interface Message { _id: string; name: string; email: string; message: string; read?: boolean; createdAt: string }
interface Post { _id: string; title?: string; title_en?: string; published?: boolean; updatedAt?: string; createdAt: string }

/** What needs the admin now, what changed lately, and the state of the site, in that order. */
export default function Overview({ name }: { name: string }) {
  const { stats } = useStats()
  const messages = useResource<Message[]>('/api/messages')
  const posts = useResource<Post[]>('/api/blogs?view=summary')
  const [health, setHealth] = useState<'ok' | 'down' | null>(null)

  useEffect(() => {
    fetch('/api/health', { cache: 'no-store' })
      .then((res) => setHealth(res.ok ? 'ok' : 'down'))
      .catch(() => setHealth('down'))
  }, [])

  const tasks = stats
    ? [
        { n: stats.pendingComments, one: 'comment waits for review', many: 'comments wait for review', href: '/admin/comments', icon: MessageSquare },
        { n: stats.unread, one: 'unread message', many: 'unread messages', href: '/admin/inbox', icon: Inbox },
        { n: stats.drafts, one: 'draft post', many: 'draft posts', href: '/admin/posts?status=draft', icon: PenLine, quiet: true },
      ].filter((task) => task.n > 0)
    : null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 19 ? 'Good afternoon' : 'Good evening'
  const recentMessages = (messages.data || []).slice().sort((a, b) => Number(!!a.read) - Number(!!b.read)).slice(0, 4)
  const recentPosts = (posts.data || []).slice(0, 4)

  return (
    <>
      <PageHeader
        title={`${greeting}, ${name.split(' ')[0]}`}
        description="What needs you first, then what changed and how the site is doing."
        actions={
          <>
            <LinkButton href="/admin/projects/new" icon={Plus}>New project</LinkButton>
            <LinkButton href="/admin/posts/new" variant="primary" icon={PenLine}>New post</LinkButton>
          </>
        }
      />

      <Panel className="overflow-hidden">
        <PanelHeader title="Needs you" />
        {!tasks ? (
          <SkeletonRows rows={2} />
        ) : tasks.length === 0 ? (
          <p className="flex items-center gap-3 px-6 py-6 text-[15px] text-fg-soft">
            <CheckCircle2 size={18} strokeWidth={1.75} className="text-fg-dim" aria-hidden="true" />
            All clear. Nothing is waiting for you.
          </p>
        ) : (
          <ul className="divide-y divide-line/[0.07]">
            {tasks.map((task) => (
              <li key={task.href}>
                <Link href={task.href} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-fg/[0.03] sm:px-6">
                  <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', task.quiet ? 'bg-fg/[0.06] text-fg-soft' : 'bg-signal/[0.12] text-signal-text')}>
                    <task.icon size={16} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <p className="flex-1 text-[15px] text-fg">
                    <span className="font-mono font-semibold tabular">{task.n}</span> {task.n === 1 ? task.one : task.many}
                  </p>
                  <ArrowRight size={16} strokeWidth={1.75} className="text-fg-dim transition-transform duration-200 group-hover:translate-x-1 group-hover:text-fg" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel className="overflow-hidden">
          <PanelHeader title="Latest messages" actions={<Link href="/admin/inbox" className="text-[13px] font-medium text-fg-soft hover:text-fg">Open inbox</Link>} />
          {messages.loading && !messages.data ? (
            <SkeletonRows rows={3} />
          ) : recentMessages.length === 0 ? (
            <p className="px-6 py-6 text-sm text-fg-dim">No messages yet.</p>
          ) : (
            <ul className="divide-y divide-line/[0.07]">
              {recentMessages.map((message) => (
                <li key={message._id}>
                  <Link href={`/admin/inbox?m=${message._id}`} className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-fg/[0.03] sm:px-6">
                    <span aria-hidden="true" className={cx('mt-2 h-2 w-2 shrink-0 rounded-full', message.read ? 'border border-fg/30' : 'bg-signal')} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className={cx('truncate text-[14px]', message.read ? 'text-fg-soft' : 'font-semibold text-fg')}>{message.name}</p>
                        <TimeAgo value={message.createdAt} />
                      </div>
                      <p className="mt-0.5 truncate text-[13px] text-fg-dim">{message.message}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="overflow-hidden">
          <PanelHeader title="Writing" actions={<Link href="/admin/posts" className="text-[13px] font-medium text-fg-soft hover:text-fg">All posts</Link>} />
          {posts.loading && !posts.data ? (
            <SkeletonRows rows={3} />
          ) : recentPosts.length === 0 ? (
            <p className="px-6 py-6 text-sm text-fg-dim">No posts yet.</p>
          ) : (
            <ul className="divide-y divide-line/[0.07]">
              {recentPosts.map((post) => (
                <li key={post._id}>
                  <Link href={`/admin/posts/${post._id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-fg/[0.03] sm:px-6">
                    <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-fg">{post.title_en || post.title || 'Untitled'}</p>
                    <Status tone={post.published ? 'live' : 'idle'}>{post.published ? 'Published' : 'Draft'}</Status>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="mt-6">
        <PanelHeader
          title="Site"
          actions={
            health && (
              <Status tone={health === 'ok' ? 'live' : 'attention'}>{health === 'ok' ? 'Database and cache healthy' : 'Health check failing'}</Status>
            )
          }
        />
        <dl className="grid grid-cols-2 divide-line/[0.07] sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
          {[
            { label: 'Projects', value: stats?.projects, href: '/admin/projects' },
            { label: 'Posts', value: stats?.blogs, href: '/admin/posts' },
            { label: 'Skills', value: stats?.skills, href: '/admin/skills' },
            { label: 'Subscribers', value: stats?.subscribers, href: '/admin/subscribers' },
            { label: 'Messages', value: stats?.messages, href: '/admin/inbox' },
          ].map((item) => (
            <Link key={item.label} href={item.href} className="group px-5 py-5 transition-colors hover:bg-fg/[0.03] sm:px-6">
              <dt className="text-[13px] text-fg-dim group-hover:text-fg-soft">{item.label}</dt>
              <dd className="mt-1 font-mono text-xl font-medium tabular text-fg">{item.value ?? '–'}</dd>
            </Link>
          ))}
        </dl>
      </Panel>
    </>
  )
}
