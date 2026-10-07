import {
  Cpu,
  FileUp,
  FolderKanban,
  Inbox,
  LayoutGrid,
  MessageSquare,
  PanelsTopLeft,
  PenLine,
  ReceiptText,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type BadgeKey = 'unread' | 'pendingComments' | 'drafts'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** A count from /api/stats shown beside the item; attention counts are coral. */
  badge?: BadgeKey
  keywords?: string
}

/** Grouped by what the admin is doing: making things, answering people, running the business. */
export const NAV: { group?: string; items: NavItem[] }[] = [
  { items: [{ href: '/admin', label: 'Overview', icon: LayoutGrid, keywords: 'home dashboard today' }] },
  {
    group: 'Content',
    items: [
      { href: '/admin/posts', label: 'Writing', icon: PenLine, badge: 'drafts', keywords: 'blog posts essays articles newsletter' },
      { href: '/admin/projects', label: 'Projects', icon: FolderKanban, keywords: 'portfolio work case studies' },
      { href: '/admin/site', label: 'Site pages', icon: PanelsTopLeft, keywords: 'sections home about education experience contact' },
      { href: '/admin/skills', label: 'Skills', icon: Cpu, keywords: 'technologies stack' },
      { href: '/admin/files', label: 'Files', icon: FileUp, keywords: 'cv photo portrait assets upload' },
    ],
  },
  {
    group: 'People',
    items: [
      { href: '/admin/inbox', label: 'Inbox', icon: Inbox, badge: 'unread', keywords: 'messages contact email' },
      { href: '/admin/comments', label: 'Comments', icon: MessageSquare, badge: 'pendingComments', keywords: 'moderation review replies' },
      { href: '/admin/subscribers', label: 'Subscribers', icon: Users, keywords: 'newsletter audience' },
    ],
  },
  { group: 'Business', items: [{ href: '/admin/invoices', label: 'Invoices', icon: ReceiptText, keywords: 'billing pdf payment' }] },
]

export const SETTINGS: NavItem = { href: '/admin/settings', label: 'Settings', icon: Settings, keywords: 'password email account cache' }

export const ALL_NAV: NavItem[] = [...NAV.flatMap((g) => g.items), SETTINGS]

/** Old hash routes (/admin#blogs) keep working. */
export const LEGACY_HASH: Record<string, string> = {
  overview: '/admin',
  sections: '/admin/site',
  skills: '/admin/skills',
  projects: '/admin/projects',
  blogs: '/admin/posts',
  invoices: '/admin/invoices',
  messages: '/admin/inbox',
  comments: '/admin/comments',
  assets: '/admin/files',
  account: '/admin/settings',
}

export function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`)
}

export interface Stats {
  messages: number
  unread: number
  projects: number
  skills: number
  blogs: number
  drafts: number
  pendingComments: number
  subscribers: number
}
