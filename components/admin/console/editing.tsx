'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { TinyMCEHandle } from '@/components/ui/tinymce'
import { Button, cx, ago } from './kit'

/** The rich-text editor loads only on pages that need it. */
export const RichText = dynamic(() => import('@/components/ui/tinymce').then((m) => m.TinyMCE), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="h-[560px] animate-pulse rounded-2xl border border-line/10 bg-fg/[0.03]" />,
})
export type { TinyMCEHandle }

export type Lang = 'en' | 'es'

/** EN / ES switch for bilingual editors; a dot marks a language that still has empty fields. */
export function LangSwitch({ value, onChange, incomplete }: { value: Lang; onChange: (lang: Lang) => void; incomplete?: Partial<Record<Lang, boolean>> }) {
  return (
    <div role="tablist" aria-label="Language" className="inline-flex items-center gap-0.5 rounded-full border border-line/10 bg-surface p-1">
      {(['en', 'es'] as const).map((lang) => {
        const active = lang === value
        return (
          <button
            key={lang}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(lang)}
            className={cx('relative inline-flex h-8 items-center gap-2 rounded-full px-4 text-[13px] font-medium transition-colors', active ? 'bg-navy text-cream' : 'text-fg-soft hover:text-fg')}
          >
            {lang === 'en' ? 'English' : 'Español'}
            {incomplete?.[lang] && <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-label="has empty fields" />}
          </button>
        )
      })}
    </div>
  )
}

/** Chips for tags: Enter, Tab or comma adds one; Backspace on an empty field removes the last. */
export function TagInput({ value, onChange, id, placeholder = 'Add a tag' }: { value: string[]; onChange: (tags: string[]) => void; id?: string; placeholder?: string }) {
  const [pending, setPending] = useState('')
  const commit = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 40)
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setPending('')
  }
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-line/15 bg-surface px-2 py-1.5 focus-within:border-signal/70">
      {value.map((tag) => (
        <span key={tag} className="inline-flex h-7 items-center gap-1 rounded-full bg-fg/[0.06] pl-2.5 pr-1 text-[12px] font-medium text-fg-soft">
          {tag}
          <button type="button" aria-label={`Remove tag ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))} className="grid h-5 w-5 place-items-center rounded-full hover:bg-fg/10 hover:text-fg">
            <X size={12} strokeWidth={2} aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={pending}
        onChange={(event) => {
          const next = event.target.value
          if (next.includes(',')) next.split(',').slice(0, -1).forEach(commit)
          else setPending(next)
        }}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === 'Tab') && pending.trim()) {
            event.preventDefault()
            commit(pending)
          } else if (event.key === 'Backspace' && !pending && value.length) onChange(value.slice(0, -1))
        }}
        onBlur={() => pending.trim() && commit(pending)}
        placeholder={value.length ? '' : placeholder}
        className="h-7 min-w-[120px] flex-1 bg-transparent px-1.5 text-[14px] text-fg placeholder:text-fg-dim/80 focus:outline-none"
      />
    </div>
  )
}

/**
 * Keeps an unsaved copy of an editor in this browser so a closed tab or an expired session loses nothing.
 * Content only (posts and projects are public once published); it is cleared on save.
 */
export function useLocalDraft<T>(key: string, value: T, dirty: boolean) {
  const [found, setFound] = useState<{ value: T; savedAt: number } | null>(null)
  const checked = useRef(false)

  useEffect(() => {
    if (checked.current) return
    checked.current = true
    try {
      const raw = localStorage.getItem(key)
      if (raw) setFound(JSON.parse(raw))
    } catch {
      // storage unavailable: drafts are a convenience only
    }
  }, [key])

  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }))
      } catch {
        // quota or privacy mode
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [key, value, dirty])

  const clear = () => {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
    setFound(null)
  }
  return { found, clear, dismiss: () => setFound(null) }
}

export function DraftBanner({ savedAt, onRestore, onDiscard }: { savedAt: number; onRestore: () => void; onDiscard: () => void }) {
  return (
    <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-signal/40 bg-surface px-5 py-3.5">
      <p className="text-[14px] text-fg">
        Unsaved edits from <span className="font-mono text-[13px]">{ago(savedAt)}</span> were kept in this browser.
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={onDiscard}>Discard them</Button>
        <Button size="sm" variant="primary" onClick={onRestore}>Restore</Button>
      </div>
    </div>
  )
}
