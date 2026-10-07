'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Check, Cpu, Pencil, Plus, Trash2, X } from 'lucide-react'
import SkillIcon from '@/components/SkillIcon'
import IconPicker from '@/components/admin/IconPicker'
import { Button, Empty, ErrorNote, Field, IconButton, Input, PageHeader, Panel, SearchField, SkeletonRows, cx } from '../console/kit'
import { api, errorMessage, useConfirm, useResource } from '../console/data'

interface Skill { _id: string; name: string; category: string; icon?: string }
interface ProjectSummary { _id: string; technologies?: { _id: string }[] }
type Draft = { _id?: string; name: string; category: string; icon: string }

const EMPTY: Draft = { name: '', category: '', icon: '' }

function SkillForm({ value, categories, onCancel, onSave, saving }: { value: Draft; categories: string[]; onCancel: () => void; onSave: (draft: Draft) => void; saving: boolean }) {
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.name.trim()) return setError('Name the skill.')
    if (!draft.category.trim()) return setError('Choose or type a category.')
    // Without a chosen icon the site resolves one from the name.
    onSave({ ...draft, name: draft.name.trim(), category: draft.category.trim().toLowerCase(), icon: draft.icon || draft.name.trim().toLowerCase() })
  }
  return (
    <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end sm:px-6">
      <Field label="Name" error={error && !draft.name.trim() ? error : null}>
        {(props) => <Input {...props} autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="PostgreSQL" />}
      </Field>
      <Field label="Category" error={error && draft.name.trim() && !draft.category.trim() ? error : null}>
        {(props) => (
          <>
            <Input {...props} list="skill-categories" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="databases" />
            <datalist id="skill-categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </>
        )}
      </Field>
      <div>
        <p className="mb-1.5 text-[13px] font-medium text-fg-soft">Icon</p>
        <IconPicker value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} placeholder="Choose an icon" />
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" loading={saving}>{value._id ? 'Save' : 'Add skill'}</Button>
      </div>
    </form>
  )
}

/** Skills by category. Projects point at these, and the home page draws them as constellations. */
export default function Skills() {
  const { data, error, loading, reload, mutate } = useResource<Skill[]>('/api/skills')
  const projects = useResource<ProjectSummary[]>('/api/projects?view=summary')
  const confirm = useConfirm()
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const skills = useMemo(() => data || [], [data])
  const usage = useMemo(() => {
    const map = new Map<string, number>()
    for (const project of projects.data || []) for (const tech of project.technologies || []) map.set(String(tech._id), (map.get(String(tech._id)) || 0) + 1)
    return map
  }, [projects.data])
  const categories = useMemo(() => [...new Set(skills.map((s) => s.category))].sort(), [skills])
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return categories
      .map((category) => [category, skills.filter((s) => s.category === category && (!q || `${s.name} ${s.category}`.toLowerCase().includes(q))).sort((a, b) => a.name.localeCompare(b.name))] as const)
      .filter(([, list]) => list.length > 0)
  }, [categories, skills, query])

  const save = async (draft: Draft) => {
    setSaving(true)
    try {
      const result = await api<Skill>('/api/skills', { method: draft._id ? 'PUT' : 'POST', body: draft })
      mutate((prev) => (draft._id ? prev?.map((s) => (s._id === draft._id ? result : s)) || prev : [...(prev || []), result]))
      setAdding(false)
      setEditing(null)
      window.dispatchEvent(new Event('admin-stats-changed'))
      toast.success(draft._id ? 'Skill saved' : `${result.name} added`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (skill: Skill) => {
    const used = usage.get(skill._id) || 0
    if (used) {
      toast.error(`${skill.name} is used by ${used} project${used === 1 ? '' : 's'}. Remove it from them first.`)
      return
    }
    const ok = await confirm({ title: `Delete ${skill.name}?`, body: 'It disappears from the skills section. This cannot be undone.' })
    if (!ok) return
    try {
      await api(`/api/skills?id=${skill._id}`, { method: 'DELETE' })
      mutate((prev) => prev?.filter((s) => s._id !== skill._id) || prev)
      window.dispatchEvent(new Event('admin-stats-changed'))
      toast.success(`${skill.name} deleted`)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const renameCategory = async () => {
    if (!renaming) return
    const to = renaming.to.trim().toLowerCase()
    if (!to || to === renaming.from) return setRenaming(null)
    setSaving(true)
    const members = skills.filter((s) => s.category === renaming.from)
    const results = await Promise.allSettled(members.map((s) => api<Skill>('/api/skills', { method: 'PUT', body: { ...s, category: to } })))
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed) toast.error(`${failed} of ${members.length} skills could not be moved`)
    else toast.success(`Renamed to ${to}`)
    setRenaming(null)
    setSaving(false)
    reload()
  }

  return (
    <>
      <PageHeader
        title="Skills"
        description="Grouped by category. Projects list the skills they were built with, and the home page draws each category as a constellation."
        actions={<Button variant="primary" icon={Plus} onClick={() => { setAdding(true); setEditing(null) }}>New skill</Button>}
      />
      {adding && (
        <Panel className="mb-6">
          <SkillForm value={EMPTY} categories={categories} saving={saving} onCancel={() => setAdding(false)} onSave={save} />
        </Panel>
      )}
      {skills.length > 8 && <SearchField value={query} onChange={setQuery} placeholder="Search skills" className="mb-4" />}
      {error && !data ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : loading && !data ? (
        <Panel><SkeletonRows rows={6} /></Panel>
      ) : groups.length === 0 ? (
        <Panel>
          <Empty icon={Cpu} title={query ? 'No skills match' : 'No skills yet'} action={!query && !adding && <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>Add the first skill</Button>}>
            {query ? 'Try another name.' : 'Add the technologies you work with; projects can then point at them.'}
          </Empty>
        </Panel>
      ) : (
        <div className="gap-4 lg:columns-2 [&>*]:mb-4">
          {groups.map(([category, list]) => (
            <Panel key={category} className="break-inside-avoid overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-line/[0.07] px-5 py-3">
                {renaming?.from === category ? (
                  <form onSubmit={(event) => { event.preventDefault(); renameCategory() }} className="flex flex-1 items-center gap-2">
                    <Input autoFocus aria-label="Category name" value={renaming.to} onChange={(event) => setRenaming({ ...renaming, to: event.target.value })} className="h-8" />
                    <IconButton size="sm" label="Save name" icon={Check} type="submit" disabled={saving} />
                    <IconButton size="sm" label="Cancel" icon={X} onClick={() => setRenaming(null)} />
                  </form>
                ) : (
                  <>
                    <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-fg-soft">
                      {category} <span className="ml-1 font-mono text-[11px] font-normal text-fg-dim">{list.length}</span>
                    </h2>
                    <IconButton size="sm" label={`Rename ${category}`} icon={Pencil} onClick={() => setRenaming({ from: category, to: category })} />
                  </>
                )}
              </div>
              <ul className="divide-y divide-line/[0.07]">
                {list.map((skill) =>
                  editing === skill._id ? (
                    <li key={skill._id} className="bg-fg/[0.02]">
                      <SkillForm value={{ _id: skill._id, name: skill.name, category: skill.category, icon: skill.icon || '' }} categories={categories} saving={saving} onCancel={() => setEditing(null)} onSave={save} />
                    </li>
                  ) : (
                    <li key={skill._id} className="group flex items-center gap-3 px-5 py-2.5">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-fg/[0.05] text-fg-soft">
                        <SkillIcon name={skill.name} icon={skill.icon || ''} size={16} />
                      </span>
                      <span className="flex-1 truncate text-[14px] font-medium text-fg">{skill.name}</span>
                      <span className={cx('font-mono text-[11px] tabular', usage.get(skill._id) ? 'text-fg-soft' : 'text-fg-dim')}>
                        {usage.get(skill._id) ? `${usage.get(skill._id)} project${usage.get(skill._id) === 1 ? '' : 's'}` : 'unused'}
                      </span>
                      <div className="flex opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                        <IconButton size="sm" label={`Edit ${skill.name}`} icon={Pencil} onClick={() => { setEditing(skill._id); setAdding(false) }} />
                        <IconButton size="sm" label={`Delete ${skill.name}`} icon={Trash2} onClick={() => remove(skill)} className="hover:!text-signal-text" />
                      </div>
                    </li>
                  ),
                )}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </>
  )
}
