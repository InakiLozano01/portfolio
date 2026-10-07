'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, ArrowUpRight, Braces, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { Button, ErrorNote, IconButton, Input, Lang, PageHeader, Panel, PanelHeader, SaveBar, SkeletonRows, Textarea, cx, useSaveShortcut, useUnsavedGuard } from '../console/kit'
import { api, errorMessage, useResource } from '../console/data'

interface Section { _id: string; title: string; order: number; visible: boolean; content: Record<string, any> }
type Content = Record<string, any>

/* EN text lives in the base field (and in field_en when a record already has one); ES in field_es.
   Unknown keys are always kept, so nothing the public site reads is dropped on save. */
const en = (obj: Content, key: string) => obj?.[`${key}_en`] ?? obj?.[key] ?? ''
const withEn = (obj: Content, key: string, value: unknown) => ({ ...obj, [key]: value, ...(`${key}_en` in (obj || {}) ? { [`${key}_en`]: value } : {}) })
const es = (obj: Content, key: string) => obj?.[`${key}_es`] ?? ''
const withEs = (obj: Content, key: string, value: unknown) => ({ ...obj, [`${key}_es`]: value })
// Editors used to leave zero-width joiners at the start of fields; drop them on save.
const tidy = (value: any): any =>
  typeof value === 'string' ? value.replace(/^[​‍\s]+/, '').replace(/[​‍]/g, '') : Array.isArray(value) ? value.map(tidy) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, tidy(v)])) : value
const lines = (value: unknown) => (Array.isArray(value) ? value.join('\n') : '')
const toLines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean)

const ABOUT: Record<string, string> = {
  home: 'The hero: your role line and the statement under it.',
  about: 'The about text next to your portrait, and your interests.',
  education: 'Degrees and schools on the timeline.',
  experience: 'Roles on the timeline, newest first.',
  skills: 'The heading and lead above the skills constellations.',
  projects: 'The heading and lead above the project cards.',
  blog: 'The heading and lead above the essay list.',
  contact: 'Where people reach you.',
}

/** A field in both languages, side by side, so translating means looking across, not switching. */
function Bi({ label, hint, value, onChange, multiline, rows = 3 }: { label: string; hint?: string; value: { en: string; es: string }; onChange: (lang: 'en' | 'es', next: string) => void; multiline?: boolean; rows?: number }) {
  const Control = multiline ? Textarea : Input
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium text-fg-soft">{label}</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {(['en', 'es'] as const).map((lang) => (
          <div key={lang} className="relative">
            <Control
              aria-label={`${label} (${lang === 'en' ? 'English' : 'Spanish'})`}
              lang={lang}
              rows={multiline ? rows : undefined}
              value={value[lang]}
              placeholder={lang === 'es' && value.en ? value.en : ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange(lang, event.target.value)}
              className={cx('pr-11', multiline && 'leading-relaxed')}
            />
            <span className="pointer-events-none absolute right-2.5 top-2.5"><Lang code={lang} /></span>
          </div>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-[12px] text-fg-dim">{hint}</p>}
    </fieldset>
  )
}

function Single({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (next: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-fg-soft">{label}</span>
      <Input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

/** Repeating entries (education, roles) with add, remove and reorder. */
function EntryList({ items, onChange, blank, title, render }: { items: Content[]; onChange: (items: Content[]) => void; blank: Content; title: (item: Content) => string; render: (item: Content, set: (next: Content) => void) => React.ReactNode }) {
  const move = (from: number, to: number) => {
    const next = [...items]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="rounded-2xl border border-line/10">
          <div className="flex items-center gap-2 border-b border-line/[0.07] px-4 py-2.5">
            <span className="font-mono text-[11px] text-fg-dim">{String(index + 1).padStart(2, '0')}</span>
            <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-fg">{title(item) || 'New entry'}</p>
            <IconButton size="sm" label="Move up" icon={ArrowUp} disabled={index === 0} onClick={() => move(index, index - 1)} />
            <IconButton size="sm" label="Move down" icon={ArrowDown} disabled={index === items.length - 1} onClick={() => move(index, index + 1)} />
            <IconButton size="sm" label="Remove entry" icon={Trash2} onClick={() => onChange(items.filter((_, i) => i !== index))} className="hover:!text-signal-text" />
          </div>
          <div className="space-y-4 p-4">{render(item, (next) => onChange(items.map((it, i) => (i === index ? next : it))))}</div>
        </div>
      ))}
      <Button icon={Plus} onClick={() => onChange([...items, blank])}>Add entry</Button>
    </div>
  )
}

function SectionForm({ kind, content, set }: { kind: string; content: Content; set: (next: Content) => void }) {
  const bi = (key: string, label: string, opts: { hint?: string; multiline?: boolean; rows?: number } = {}) => (
    <Bi label={label} {...opts} value={{ en: en(content, key), es: es(content, key) }} onChange={(lang, v) => set(lang === 'en' ? withEn(content, key, v) : withEs(content, key, v))} />
  )
  switch (kind) {
    case 'home':
      return (
        <div className="space-y-6">
          {bi('headline', 'Role line', { hint: 'Under your name in the hero.' })}
          {bi('description', 'Statement', { multiline: true, rows: 5, hint: 'The large text that lights up word by word below the hero.' })}
        </div>
      )
    case 'about':
      return (
        <div className="space-y-6">
          {bi('description', 'About text', { multiline: true, rows: 9, hint: 'Leave an empty line between paragraphs.' })}
          <Bi
            label="Interests"
            hint="One per line."
            multiline
            rows={5}
            value={{ en: lines(en(content, 'highlights')), es: lines(es(content, 'highlights')) }}
            onChange={(lang, v) => set(lang === 'en' ? withEn(content, 'highlights', toLines(v)) : withEs(content, 'highlights', toLines(v)))}
          />
        </div>
      )
    case 'education':
      return (
        <EntryList
          items={content.education || []}
          onChange={(education) => set({ ...content, education })}
          blank={{ institution: '', degree: '', period: '' }}
          title={(item) => en(item, 'degree') || item.institution}
          render={(item, put) => (
            <>
              <Bi label="Degree" value={{ en: en(item, 'degree'), es: es(item, 'degree') }} onChange={(l, v) => put(l === 'en' ? withEn(item, 'degree', v) : withEs(item, 'degree', v))} />
              <Single label="Institution" value={item.institution || ''} onChange={(v) => put({ ...item, institution: v })} />
              <Bi label="Period" hint="Write “Present” / “Presente” for ongoing; the timeline marks it live." value={{ en: en(item, 'period'), es: es(item, 'period') }} onChange={(l, v) => put(l === 'en' ? withEn(item, 'period', v) : withEs(item, 'period', v))} />
              <Bi label="Note" multiline rows={2} value={{ en: en(item, 'description'), es: es(item, 'description') }} onChange={(l, v) => put(l === 'en' ? withEn(item, 'description', v) : withEs(item, 'description', v))} />
            </>
          )}
        />
      )
    case 'experience':
      return (
        <EntryList
          items={content.experiences || []}
          onChange={(experiences) => set({ ...content, experiences })}
          blank={{ title: '', company: '', period: '', responsibilities: [] }}
          title={(item) => `${en(item, 'title')}${item.company ? ` · ${item.company}` : ''}`}
          render={(item, put) => (
            <>
              <Bi label="Role" value={{ en: en(item, 'title'), es: es(item, 'title') }} onChange={(l, v) => put(l === 'en' ? withEn(item, 'title', v) : withEs(item, 'title', v))} />
              <Single label="Company" value={item.company || ''} onChange={(v) => put({ ...item, company: v })} />
              <Bi label="Period" hint="Write “Present” / “Presente” for your current role." value={{ en: en(item, 'period'), es: es(item, 'period') }} onChange={(l, v) => put(l === 'en' ? withEn(item, 'period', v) : withEs(item, 'period', v))} />
              <Bi label="Summary" multiline rows={2} value={{ en: en(item, 'description'), es: es(item, 'description') }} onChange={(l, v) => put(l === 'en' ? withEn(item, 'description', v) : withEs(item, 'description', v))} />
              <Bi
                label="What you did"
                hint="One per line."
                multiline
                rows={5}
                value={{ en: lines(en(item, 'responsibilities')), es: lines(es(item, 'responsibilities')) }}
                onChange={(l, v) => put(l === 'en' ? withEn(item, 'responsibilities', toLines(v)) : withEs(item, 'responsibilities', toLines(v)))}
              />
            </>
          )}
        />
      )
    case 'contact':
      return (
        <div className="space-y-6">
          <Single label="Email" type="email" value={content.email || ''} onChange={(v) => set({ ...content, email: v })} />
          {bi('city', 'City')}
          <div className="grid gap-4 md:grid-cols-2">
            <Single label="GitHub" type="url" placeholder="https://github.com/…" value={content.social?.github || ''} onChange={(v) => set({ ...content, social: { ...content.social, github: v } })} />
            <Single label="LinkedIn" type="url" placeholder="https://linkedin.com/in/…" value={content.social?.linkedin || ''} onChange={(v) => set({ ...content, social: { ...content.social, linkedin: v } })} />
          </div>
        </div>
      )
    case 'skills':
    case 'projects':
    case 'blog':
      return (
        <div className="space-y-6">
          {bi('title', 'Heading', { hint: 'Leave empty to use the default heading.' })}
          {bi('description', 'Lead', { multiline: true, rows: 3 })}
        </div>
      )
    default:
      return <p className="text-sm text-fg-dim">This section has no form. Edit its data below.</p>
  }
}

/** The site's sections, in page order: show or hide them, move them, and edit their words in both languages. */
export default function Site() {
  const router = useRouter()
  const params = useSearchParams()
  const { data, error, loading, reload, mutate } = useResource<Section[]>('/api/sections')
  const sections = useMemo(() => [...(data || [])].sort((a, b) => a.order - b.order), [data])
  const selectedId = params.get('s') || sections[0]?._id
  const selected = sections.find((s) => s._id === selectedId) || null
  const [content, setContent] = useState<Content | null>(null)
  const [base, setBase] = useState('')
  const [raw, setRaw] = useState<string | null>(null)
  const [rawError, setRawError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!selected) return
    setContent(selected.content || {})
    setBase(JSON.stringify(selected.content || {}))
    setRaw(null)
    setRawError(null)
    // Only when another section is opened; list actions (show, hide, move) must not reset the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?._id])

  const dirty = content !== null && JSON.stringify(content) !== base
  useUnsavedGuard(dirty)

  const refreshSite = () => api('/api/sections/refresh', { method: 'POST' }).catch(() => {})

  const update = async (section: Section, patch: Partial<Section>, quiet = false) => {
    const updated = await api<Section>(`/api/sections/${section._id}`, { method: 'PUT', body: patch })
    mutate((prev) => prev?.map((s) => (s._id === section._id ? { ...s, ...updated } : s)) || prev)
    if (!quiet) refreshSite()
    return updated
  }

  const save = async () => {
    if (!selected || !content || saving) return
    setSaving(true)
    try {
      const clean = tidy(content)
      await update(selected, { content: clean })
      setContent(clean)
      setBase(JSON.stringify(clean))
      toast.success(`${selected.title} saved. The site updates now.`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }
  useSaveShortcut(save, dirty)

  const toggle = async (section: Section) => {
    try {
      await update(section, { visible: !section.visible })
      toast.success(`${section.title} ${section.visible ? 'hidden' : 'shown'} on the site`)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const move = async (index: number, to: number) => {
    const a = sections[index]
    const b = sections[to]
    if (!a || !b) return
    try {
      await Promise.all([update(a, { order: b.order }, true), update(b, { order: a.order }, true)])
      refreshSite()
    } catch (err) {
      toast.error(errorMessage(err))
      reload()
    }
  }

  const select = (id: string) => {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return
    router.replace(`/admin/site?s=${id}`, { scroll: false })
  }

  const kind = selected?.title.toLowerCase() || ''

  return (
    <>
      <PageHeader
        title="Site pages"
        description="The sections of the home page, top to bottom. Changes go live as soon as you save."
        actions={
          <a href="/en" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-line/15 bg-surface px-4 text-sm font-medium text-fg transition-colors hover:border-line/40">
            View site <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden="true" />
          </a>
        }
      />
      {error && !data ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <Panel as="div" className="h-fit overflow-hidden lg:sticky lg:top-6">
            {loading && !data ? (
              <SkeletonRows rows={8} />
            ) : (
              <ol className="divide-y divide-line/[0.07]">
                {sections.map((section, index) => {
                  const active = section._id === selected?._id
                  return (
                    <li key={section._id} className={cx('group flex items-center gap-1 pr-2', active && 'bg-navy')}>
                      <button type="button" onClick={() => select(section._id)} aria-current={active ? 'true' : undefined} className={cx('flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left text-[14px] font-medium', active ? 'text-cream' : section.visible ? 'text-fg' : 'text-fg-dim')}>
                        <span className={cx('font-mono text-[11px]', active ? 'text-cream/60' : 'text-fg-dim')}>{String(index + 1).padStart(2, '0')}</span>
                        <span className={cx('truncate', !section.visible && 'line-through decoration-1')}>{section.title}</span>
                      </button>
                      <div className={cx('flex items-center', active ? 'text-cream' : '')}>
                        <IconButton size="sm" label={`Move ${section.title} up`} icon={ArrowUp} disabled={index === 0} onClick={() => move(index, index - 1)} className={cx('hidden sm:grid', active ? '!text-cream/70 hover:!bg-cream/10' : 'sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100')} />
                        <IconButton size="sm" label={`Move ${section.title} down`} icon={ArrowDown} disabled={index === sections.length - 1} onClick={() => move(index, index + 1)} className={cx('hidden sm:grid', active ? '!text-cream/70 hover:!bg-cream/10' : 'sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100')} />
                        <IconButton size="sm" label={section.visible ? `Hide ${section.title}` : `Show ${section.title}`} icon={section.visible ? Eye : EyeOff} onClick={() => toggle(section)} className={active ? '!text-cream/70 hover:!bg-cream/10' : ''} />
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </Panel>

          {selected && content && (
            <div className="min-w-0">
              <Panel>
                <PanelHeader title={selected.title} description={ABOUT[kind] || 'A custom section.'} actions={!selected.visible && <span className="text-[12px] font-medium text-signal-text">Hidden on the site</span>} />
                <div className="p-5 sm:p-6">
                  <SectionForm kind={kind} content={content} set={setContent} />
                </div>
                <details className="border-t border-line/[0.07]" open={raw !== null} onToggle={(event) => { if ((event.target as HTMLDetailsElement).open && raw === null) setRaw(JSON.stringify(content, null, 2)) }}>
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-3.5 text-[13px] font-medium text-fg-dim hover:text-fg-soft">
                    <Braces size={14} strokeWidth={1.75} aria-hidden="true" /> Section data (JSON)
                  </summary>
                  {raw !== null && (
                    <div className="px-6 pb-6">
                      <Textarea
                        aria-label="Section data as JSON"
                        spellCheck={false}
                        value={raw}
                        rows={14}
                        onChange={(event) => {
                          setRaw(event.target.value)
                          try {
                            const parsed = JSON.parse(event.target.value)
                            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('The data must be an object.')
                            setContent(parsed)
                            setRawError(null)
                          } catch (err) {
                            setRawError(err instanceof Error ? err.message : 'Invalid JSON')
                          }
                        }}
                        className="font-mono text-[12px]"
                      />
                      {rawError && <p role="alert" className="mt-1.5 text-[12px] text-signal-text">{rawError}. The form keeps the last valid data.</p>}
                    </div>
                  )}
                </details>
              </Panel>
            </div>
          )}
        </div>
      )}
      {selected && <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => { setContent(selected.content || {}); setRaw(null) }} />}
    </>
  )
}
