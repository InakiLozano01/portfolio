'use client'

import Link from 'next/link'
import { forwardRef, useEffect, useId, useRef, useState } from 'react'
import { AlertCircle, ArrowLeft, Loader2, Search, X, type LucideIcon } from 'lucide-react'

/* The console's vocabulary. Every screen is built from these, so a save button, a field or an empty list
   looks and behaves the same everywhere. Colours come from the field roles (fg, line, surface, signal,
   action) set by .field-cream on the work surface and .field-navy on the rail. */

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const base =
  'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50'
const variants: Record<Variant, string> = {
  primary: 'bg-action text-action-fg hover:bg-navy disabled:bg-fg/[0.08] disabled:text-fg-dim disabled:opacity-100',
  secondary: 'border border-line/15 bg-surface text-fg hover:border-line/40',
  ghost: 'text-fg-soft hover:bg-fg/[0.06] hover:text-fg',
  danger: 'border border-signal-text/25 bg-surface text-signal-text hover:border-signal-text hover:bg-signal-text hover:text-cream',
}
const sizes: Record<Size, string> = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-sm' }

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', className?: string) {
  return cx(base, variants[variant], sizes[size], className)
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, loading, children, className, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClass(variant, size, className)} {...props}>
      {loading ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : Icon ? <Icon size={15} strokeWidth={1.75} aria-hidden="true" /> : null}
      {children}
    </button>
  )
})

export function LinkButton({ href, variant = 'secondary', size = 'md', icon: Icon, children, className, ...props }: { href: string; variant?: Variant; size?: Size; icon?: LucideIcon; children: React.ReactNode; className?: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {Icon && <Icon size={15} strokeWidth={1.75} aria-hidden="true" />}
      {children}
    </Link>
  )
}

export function IconButton({ label, icon: Icon, className, size = 'md', ...props }: { label: string; icon: LucideIcon; size?: Size } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('grid shrink-0 place-items-center rounded-full text-fg-soft transition-colors duration-150 hover:bg-fg/[0.07] hover:text-fg disabled:opacity-40', size === 'sm' ? 'h-8 w-8' : 'h-10 w-10', className)}
      {...props}
    >
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}

export function PageHeader({ title, description, actions, back }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-3 inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-fg-dim transition-colors hover:text-fg">
            <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
            {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-fg [text-wrap:balance]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-fg-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Panel({ children, className, as: As = 'section', ...props }: { children: React.ReactNode; className?: string; as?: 'section' | 'div' | 'form' | 'ul' } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cx('rounded-2xl border border-line/10 bg-surface', className)} {...(props as Record<string, unknown>)}>
      {children}
    </As>
  )
}

export function PanelHeader({ title, description, actions }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/[0.07] px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] leading-relaxed text-fg-dim">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

interface FieldProps {
  label: React.ReactNode
  hint?: React.ReactNode
  error?: string | null
  /** Shown right of the label, e.g. a character count or a language tag. */
  aside?: React.ReactNode
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode
  className?: string
}

export function Field({ label, hint, error, aside, children, className }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-fg-soft">
          {label}
        </label>
        {aside}
      </div>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-[12px] leading-relaxed text-fg-dim">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-signal-text">
          <AlertCircle size={13} strokeWidth={2} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

const control =
  'w-full rounded-xl border bg-surface px-3.5 text-[14px] text-fg placeholder:text-fg-dim/80 transition-[border-color] duration-150 focus:border-signal/70 focus:outline-none disabled:cursor-not-allowed disabled:bg-fg/[0.04] disabled:text-fg-dim aria-[invalid=true]:border-signal'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cx(control, 'h-10 border-line/15', className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cx(control, 'min-h-[96px] max-h-[70vh] resize-y border-line/15 py-2.5 leading-relaxed [field-sizing:content]', className)} {...props} />
})

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cx(control, 'h-10 appearance-none border-line/15 bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9', className)} style={{ backgroundImage: CHEVRON }} {...props}>
      {children}
    </select>
  )
})
const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235c6677' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`

export function Switch({ checked, onChange, label, description, disabled, id }: { checked: boolean; onChange: (next: boolean) => void; label: React.ReactNode; description?: React.ReactNode; disabled?: boolean; id?: string }) {
  const auto = useId()
  const switchId = id || auto
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={switchId} className="text-sm font-medium text-fg">
          {label}
        </label>
        {description && <p className="mt-0.5 text-[13px] leading-relaxed text-fg-dim">{description}</p>}
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50', checked ? 'bg-navy' : 'bg-fg/20')}
      >
        <span className={cx('absolute left-0 top-1 h-4 w-4 rounded-full transition-transform duration-200', checked ? 'translate-x-5 bg-coral' : 'translate-x-1 bg-surface')} />
      </button>
    </div>
  )
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string; count?: number }[]; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-line/10 bg-surface p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cx('inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150', active ? 'bg-navy text-cream' : 'text-fg-soft hover:text-fg')}
          >
            {option.label}
            {typeof option.count === 'number' && <span className={cx('font-mono text-[11px] tabular', active ? 'text-cream/70' : 'text-fg-dim')}>{option.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function SearchField({ value, onChange, placeholder = 'Search', label, className }: { value: string; onChange: (value: string) => void; placeholder?: string; label?: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <Search size={15} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-dim" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label || placeholder}
        className={cx(control, 'h-10 rounded-full border-line/15 pl-10 pr-9 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange('')} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-fg-dim hover:bg-fg/[0.06] hover:text-fg">
          <X size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export function Empty({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full border border-line/10 text-fg-dim">
        <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold text-fg">{title}</h3>
      {children && <p className="mt-1 max-w-[46ch] text-[13px] leading-relaxed text-fg-dim">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-signal/40 bg-surface px-5 py-4">
      <p className="flex items-center gap-2 text-sm text-signal-text">
        <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" />
        {message}
      </p>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cx('divide-y divide-line/[0.07]', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 sm:px-6">
          <div className="h-2.5 w-2.5 rounded-full bg-fg/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded-full bg-fg/[0.08]" style={{ width: `${46 + ((i * 17) % 34)}%` }} />
            <div className="h-2.5 rounded-full bg-fg/[0.05]" style={{ width: `${28 + ((i * 23) % 30)}%` }} />
          </div>
          <div className="h-2.5 w-14 rounded-full bg-fg/[0.06]" />
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  )
}

type Tone = 'live' | 'idle' | 'attention' | 'muted'

/** The node vocabulary from the public site: a solid signal dot for live, a hollow ring for idle. */
export function Status({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium', tone === 'attention' ? 'text-signal-text' : tone === 'muted' ? 'text-fg-dim' : 'text-fg-soft', className)}>
      <span
        aria-hidden="true"
        className={cx('h-2 w-2 shrink-0 rounded-full', tone === 'live' || tone === 'attention' ? 'bg-signal' : tone === 'idle' ? 'border border-fg/40' : 'bg-fg/25')}
      />
      {children}
    </span>
  )
}

export function Count({ n, tone = 'idle', label }: { n: number; tone?: 'idle' | 'attention'; label?: string }) {
  if (!n) return null
  return (
    <span aria-label={label} className={cx('inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[11px] font-medium tabular', tone === 'attention' ? 'bg-signal text-navy' : 'bg-fg/10 text-fg-soft')}>
      {n > 99 ? '99+' : n}
    </span>
  )
}

export function Lang({ code }: { code: 'en' | 'es' }) {
  return <span className="rounded-md bg-fg/[0.06] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-fg-dim">{code}</span>
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-current/20 px-1.5 py-px font-mono text-[10px] font-medium opacity-70">{children}</kbd>
}

export function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max
  return <span className={cx('font-mono text-[11px] tabular', over ? 'text-signal-text' : 'text-fg-dim')}>{value.length}/{max}</span>
}

/* Dates in the console: absolute where precision matters, relative for recency. */
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
export const formatDate = (value?: string | number | Date | null) => (value ? dateFormat.format(new Date(value)) : '')
export const formatDateTime = (value?: string | number | Date | null) => (value ? timeFormat.format(new Date(value)) : '')
export function ago(value?: string | number | Date | null) {
  if (!value) return ''
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} d ago`
  return formatDate(value)
}

export function TimeAgo({ value, className }: { value?: string | Date | null; className?: string }) {
  if (!value) return null
  return (
    <time dateTime={new Date(value).toISOString()} title={formatDateTime(value)} className={cx('font-mono text-[11px] tabular text-fg-dim', className)}>
      {ago(value)}
    </time>
  )
}

/** Warns before leaving a page with unsaved edits (tab close, reload or an in-app link). */
export function useUnsavedGuard(dirty: boolean) {
  const dirtyRef = useRef(dirty)
  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return
      event.preventDefault()
    }
    const onClick = (event: MouseEvent) => {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target === '_blank' || anchor.origin !== window.location.origin || anchor.hasAttribute('download')) return
      if (anchor.pathname === window.location.pathname) return
      if (!window.confirm('You have unsaved changes. Leave without saving?')) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [])
}

/** ⌘S / Ctrl+S runs the save handler instead of the browser's "save page". */
export function useSaveShortcut(onSave: () => void, enabled = true) {
  const handler = useRef(onSave)
  useEffect(() => {
    handler.current = onSave
  }, [onSave])
  useEffect(() => {
    if (!enabled) return
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        handler.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}

/** A sticky bar at the foot of an editor: what changed, and the save action, always in reach. */
export function SaveBar({ dirty, saving, onSave, onDiscard, saveLabel = 'Save changes', note, children }: { dirty: boolean; saving?: boolean; onSave: () => void; onDiscard?: () => void; saveLabel?: string; note?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className={cx('sticky bottom-0 z-20 -mx-5 mt-10 border-t border-line/10 bg-field/95 px-5 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8', !dirty && !saving && 'hidden sm:block')}>
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13px] text-fg-dim" aria-live="polite">
          {dirty ? <Status tone="attention">Unsaved changes</Status> : note || <Status tone="idle">All changes saved</Status>}
        </p>
        <div className="flex items-center gap-2">
          {children}
          {onDiscard && dirty && (
            <Button variant="ghost" onClick={onDiscard} disabled={saving}>
              Discard
            </Button>
          )}
          <Button variant="primary" onClick={onSave} loading={saving} disabled={!dirty && !saving}>
            {saveLabel}
            <span className="hidden sm:inline"><Kbd>⌘S</Kbd></span>
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Copies text and reports it for a moment. */
export function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }
  return { copied, copy }
}
