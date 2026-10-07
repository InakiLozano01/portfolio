'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { ArrowUpRight, LogOut, Menu, Search, X } from 'lucide-react'
import { adminFetch } from '@/lib/admin-fetch'
import { Count, Kbd, cx } from './kit'
import { ConfirmProvider, SESSION_EXPIRED, api } from './data'
import { ALL_NAV, LEGACY_HASH, NAV, SETTINGS, isActive, type NavItem, type Stats } from './nav'
import CommandPalette from './CommandPalette'

/* The console frame: a navy rail with everything one click away, a cream work surface, a command palette
   (⌘K) for everything else, and a session that stays alive while the admin is working. */

const StatsContext = createContext<{ stats: Stats | null; refresh: () => void }>({ stats: null, refresh: () => {} })
export const useStats = () => useContext(StatsContext)

const WARM = ['/api/stats', '/api/blogs?view=summary', '/api/projects?view=summary', '/api/skills', '/api/sections']

function NavLink({ item, pathname, stats, onNavigate }: { item: NavItem; pathname: string; stats: Stats | null; onNavigate?: () => void }) {
  const active = isActive(pathname, item.href)
  const count = item.badge && stats ? stats[item.badge] : 0
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'group flex h-9 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors duration-150',
        active ? 'bg-surface text-fg' : 'text-fg-soft hover:bg-fg/[0.06] hover:text-fg',
      )}
    >
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" className={active ? 'text-coral' : 'text-fg-dim group-hover:text-fg-soft'} />
      <span className="flex-1 truncate">{item.label}</span>
      {count > 0 && <Count n={count} tone={item.badge === 'drafts' ? 'idle' : 'attention'} label={`${count} ${item.badge === 'drafts' ? 'drafts' : 'waiting'}`} />}
    </Link>
  )
}

function Rail({ pathname, stats, user, onSearch, onNavigate }: { pathname: string; stats: Stats | null; user: { name: string; email: string }; onSearch: () => void; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-3 px-5">
        <Image src="/il-logo-mark.png" alt="" width={24} height={24} priority />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[14px] font-semibold tracking-tight text-fg">Iñaki F. Lozano</p>
          <p className="text-[12px] text-fg-dim">Console</p>
        </div>
      </div>
      <div className="px-3">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-9 w-full items-center gap-2.5 rounded-xl border border-line/10 px-3 text-[13px] text-fg-dim transition-colors hover:border-line/25 hover:text-fg-soft"
        >
          <Search size={15} strokeWidth={1.75} aria-hidden="true" />
          <span className="flex-1 text-left">Search or jump to…</span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>
      <nav aria-label="Console" className="mt-4 flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((group, i) => (
          <div key={group.group || i} className={i ? 'mt-5' : ''}>
            {group.group && <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-dim">{group.group}</p>}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} pathname={pathname} stats={stats} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="shrink-0 space-y-0.5 border-t border-line/[0.08] px-3 py-3">
        <NavLink item={SETTINGS} pathname={pathname} stats={stats} onNavigate={onNavigate} />
        <a
          href="/en"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-fg-soft transition-colors hover:bg-fg/[0.06] hover:text-fg"
        >
          <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" className="text-fg-dim" />
          View site
        </a>
        <div className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2">
          <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cream font-mono text-[11px] font-semibold text-navy">
            {user.name
              .split(/\s+/)
              .map((part) => part[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium text-fg">{user.name}</p>
            <p className="truncate text-[12px] text-fg-dim">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            aria-label="Sign out"
            title="Sign out"
            className="grid h-8 w-8 place-items-center rounded-full text-fg-dim transition-colors hover:bg-fg/[0.08] hover:text-fg"
          >
            <LogOut size={15} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Console({ user, children }: { user: { name: string; email: string }; children: React.ReactNode }) {
  const pathname = usePathname() || '/admin'
  const router = useRouter()
  const { update } = useSession()
  const [stats, setStats] = useState<Stats | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expired, setExpired] = useState(false)
  const drawerRef = useRef<HTMLDialogElement | null>(null)

  const refresh = useCallback(() => {
    api<Stats>('/api/stats').then(setStats).catch(() => {})
  }, [])

  // Counts: on load, every minute, and whenever something that moves them changes.
  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 60_000)
    const onChange = () => refresh()
    window.addEventListener('admin-comments-changed', onChange)
    window.addEventListener('admin-stats-changed', onChange)
    return () => {
      clearInterval(timer)
      window.removeEventListener('admin-comments-changed', onChange)
      window.removeEventListener('admin-stats-changed', onChange)
    }
  }, [refresh])

  // Warm the lists the admin is most likely to open next.
  useEffect(() => {
    const idle = (window as any).requestIdleCallback || ((fn: () => void) => setTimeout(fn, 600))
    idle(() => WARM.forEach((url) => adminFetch(url).catch(() => {})))
  }, [])

  // Old hash links (/admin#blogs) land on their new page.
  useEffect(() => {
    const target = LEGACY_HASH[window.location.hash.slice(1)]
    if (pathname === '/admin' && target && target !== '/admin') router.replace(target)
  }, [pathname, router])

  // Keep the session alive while the admin is active (refresh at most every 4 minutes); idle tabs still expire.
  useEffect(() => {
    let last = Date.now()
    const onActivity = () => {
      if (Date.now() - last < 4 * 60_000) return
      last = Date.now()
      update().catch(() => {})
    }
    const onExpired = () => setExpired(true)
    window.addEventListener('keydown', onActivity, { passive: true })
    window.addEventListener('pointerdown', onActivity, { passive: true })
    window.addEventListener(SESSION_EXPIRED, onExpired)
    return () => {
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('pointerdown', onActivity)
      window.removeEventListener(SESSION_EXPIRED, onExpired)
    }
  }, [update])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      } else if (event.key === '/' && !typing) {
        event.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const dialog = drawerRef.current
    if (!dialog) return
    if (drawerOpen && !dialog.open) dialog.showModal()
    if (!drawerOpen && dialog.open) dialog.close()
  }, [drawerOpen])

  const current = ALL_NAV.find((item) => isActive(pathname, item.href))

  return (
    <StatsContext.Provider value={{ stats, refresh }}>
      <ConfirmProvider>
        <div className="synapse admin-ui field-cream min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
          <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-cream focus:px-4 focus:py-2 focus:text-sm focus:text-navy">
            Skip to content
          </a>

          <aside className="field-navy hidden lg:block">
            <div className="sticky top-0 h-dvh">
              <Rail pathname={pathname} stats={stats} user={user} onSearch={() => setPaletteOpen(true)} />
            </div>
          </aside>

          {/* Phones and tablets: a slim bar with search and a drawer holding the same rail. */}
          <div className="field-navy sticky top-0 z-40 flex h-14 items-center gap-2 px-3 lg:hidden">
            <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open navigation" className="grid h-10 w-10 place-items-center rounded-full text-fg hover:bg-fg/[0.08]">
              <Menu size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <Image src="/il-logo-mark.png" alt="" width={20} height={20} />
            <p className="flex-1 truncate text-[14px] font-semibold text-fg">{current?.label || 'Console'}</p>
            <button type="button" onClick={() => setPaletteOpen(true)} aria-label="Search" className="grid h-10 w-10 place-items-center rounded-full text-fg hover:bg-fg/[0.08]">
              <Search size={17} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          <dialog
            ref={drawerRef}
            onClose={() => setDrawerOpen(false)}
            onClick={(event) => event.target === drawerRef.current && setDrawerOpen(false)}
            aria-label="Navigation"
            className="field-navy fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-dvh w-[min(300px,86vw)] p-0 backdrop:bg-navy/60 lg:hidden"
          >
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close navigation" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full text-fg hover:bg-fg/[0.08]">
              <X size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <Rail pathname={pathname} stats={stats} user={user} onSearch={() => { setDrawerOpen(false); setPaletteOpen(true) }} onNavigate={() => setDrawerOpen(false)} />
          </dialog>

          <main id="admin-main" tabIndex={-1} className="min-w-0 px-5 pb-16 pt-8 focus:outline-none sm:px-8 lg:pt-10">
            {expired && (
              <div role="alert" className="mx-auto mb-6 flex max-w-[1200px] flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy px-5 py-3.5 text-[14px] text-cream">
                <p>Your session ended. Sign in again in a new tab; nothing on this page is lost.</p>
                <div className="flex items-center gap-2">
                  <a
                    href={`/admin/login?expired=1&callbackUrl=${encodeURIComponent('/admin/settings')}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-cream px-4 text-[13px] font-medium text-navy transition-colors hover:bg-coral"
                  >
                    Sign in <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
                  </a>
                  <button type="button" onClick={() => setExpired(false)} className="h-9 rounded-full px-3 text-[13px] text-[#c3c9d3] hover:text-cream">
                    I signed in
                  </button>
                </div>
              </div>
            )}
            <div className="mx-auto max-w-[1200px]">{children}</div>
          </main>
        </div>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </ConfirmProvider>
    </StatsContext.Provider>
  )
}
