'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArrowUpRight, Check, ImagePlus, Trash2 } from 'lucide-react'
import { slugify } from '@/lib/utils'
import { DEFAULT_PROJECT_THUMBNAIL_OPTIMIZATION, type ProjectThumbnailOptimization } from '@/lib/project-thumbnail-settings'
import { Button, ErrorNote, Field, Input, PageHeader, Panel, PanelHeader, SaveBar, SearchField, SkeletonRows, cx, useSaveShortcut, useUnsavedGuard } from '../console/kit'
import { api, errorMessage, useConfirm, useResource } from '../console/data'
import { DraftBanner, LangSwitch, RichText, useLocalDraft, type Lang, type TinyMCEHandle } from '../console/editing'

interface Skill { _id: string; name: string; category: string }

export interface Project {
  _id?: string
  title_en: string
  title_es: string
  subtitle_en: string
  subtitle_es: string
  description_en: string
  description_es: string
  slug: string
  technologies: string[]
  thumbnail: string
  thumbnailAlt: string
  imageWidth?: number
  imageHeight?: number
  thumbnailOptimization: ProjectThumbnailOptimization
  githubUrl: string
  publicUrl: string
  featured?: boolean
}

const BLANK: Project = {
  title_en: '', title_es: '', subtitle_en: '', subtitle_es: '', description_en: '', description_es: '',
  slug: '', technologies: [], thumbnail: '', thumbnailAlt: '', githubUrl: '', publicUrl: '',
  thumbnailOptimization: DEFAULT_PROJECT_THUMBNAIL_OPTIMIZATION,
}

const snapshot = (p: Project) => JSON.stringify([p.title_en, p.title_es, p.subtitle_en, p.subtitle_es, p.description_en, p.description_es, p.slug, [...p.technologies].sort(), p.thumbnail, p.thumbnailAlt, p.githubUrl, p.publicUrl, p.thumbnailOptimization])

function fromServer(raw: Record<string, any>): Project {
  return {
    ...BLANK,
    _id: raw._id,
    title_en: raw.title_en || raw.title || '',
    title_es: raw.title_es || '',
    subtitle_en: raw.subtitle_en || raw.subtitle || '',
    subtitle_es: raw.subtitle_es || '',
    description_en: raw.description_en || raw.description || '',
    description_es: raw.description_es || '',
    slug: raw.slug || '',
    technologies: (raw.technologies || []).map((t: any) => String(t?._id || t)),
    thumbnail: raw.thumbnail || '',
    thumbnailAlt: raw.thumbnailAlt || '',
    imageWidth: raw.imageWidth,
    imageHeight: raw.imageHeight,
    thumbnailOptimization: { ...DEFAULT_PROJECT_THUMBNAIL_OPTIMIZATION, ...(raw.thumbnailOptimization || {}) },
    githubUrl: raw.githubUrl || '',
    publicUrl: raw.publicUrl || '',
    featured: raw.featured === true,
  }
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

/** A case study: words in both languages, a cover, links and the technologies it was built with. */
export default function ProjectEditor({ id }: { id?: string }) {
  const router = useRouter()
  const confirm = useConfirm()
  const editorRef = useRef<TinyMCEHandle | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const skills = useResource<Skill[]>('/api/skills')
  const [project, setProject] = useState<Project>(BLANK)
  const [base, setBase] = useState<Project>(BLANK)
  const saved = snapshot(base)
  const current = useRef<Project>(BLANK)
  const readyAt = useRef(0)
  const [loading, setLoading] = useState(!!id)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; subtitle?: string; form?: string }>({})
  const [lang, setLang] = useState<Lang>('en')
  const [techQuery, setTechQuery] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)

  current.current = project
  const dirty = snapshot(project) !== saved
  // TinyMCE re-serialises the HTML it is given right after init; that is not an edit.
  const editorChange = (value: string) => {
    const key = `description_${lang}` as const
    if (Date.now() - readyAt.current < 1200) setBase((b) => (b[key] === current.current[key] ? { ...b, [key]: value } : b))
    set(key, value)
  }
  const draft = useLocalDraft<Project>(`console:project:${id || 'new'}`, project, dirty)
  useUnsavedGuard(dirty)

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    setLoadError(null)
    api(`/api/projects/${id}`)
      .then((raw) => {
        const next = fromServer(raw)
        setProject(next)
        setBase(next)
        setSlugTouched(true)
      })
      .catch((error) => setLoadError(errorMessage(error)))
      .finally(() => setLoading(false))
  }, [id])
  useEffect(load, [load])

  const set = <K extends keyof Project>(key: K, value: Project[K]) =>
    setProject((prev) => {
      const next = { ...prev, [key]: value }
      if (!slugTouched && key === 'title_en') next.slug = slugify(String(value))
      return next
    })

  const switchLang = async (next: Lang) => {
    try {
      const content = await editorRef.current?.uploadImages()
      if (typeof content === 'string') setProject((prev) => ({ ...prev, [`description_${lang}`]: content }))
    } catch (error) {
      toast.error(errorMessage(error))
    }
    setLang(next)
  }

  const upload = async (file: File | undefined) => {
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error('Use a JPEG, PNG, WebP or AVIF image.')
      return
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error('That image is over 6 MB. Export a smaller one.')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('thumbnailOptimizationQuality', String(project.thumbnailOptimization.quality))
      form.append('thumbnailOptimizationEffort', String(project.thumbnailOptimization.effort))
      const data = await api<{ path: string; width?: number; height?: number; thumbnailOptimization?: ProjectThumbnailOptimization }>('/api/upload', { method: 'POST', form })
      setProject((prev) => ({ ...prev, thumbnail: data.path, imageWidth: data.width, imageHeight: data.height, thumbnailOptimization: data.thumbnailOptimization || prev.thumbnailOptimization }))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const save = async () => {
    if (saving) return
    const next: typeof errors = {}
    if (project.title_en.trim().length < 3) next.title = 'Give it an English title of at least 3 characters.'
    if (project.subtitle_en.trim().length < 3) next.subtitle = 'Add a one-line English subtitle.'
    setErrors(next)
    if (next.title || next.subtitle) {
      setLang('en')
      return
    }
    setSaving(true)
    try {
      const description = await editorRef.current?.uploadImages()
      const current = typeof description === 'string' ? { ...project, [`description_${lang}`]: description } : project
      const payload = {
        ...current,
        slug: slugify(current.slug || current.title_en),
        title: current.title_en,
        subtitle: current.subtitle_en,
        description: current.description_en,
      }
      const result = await api(id ? `/api/projects/${id}` : '/api/projects', { method: id ? 'PUT' : 'POST', body: payload })
      const stored = fromServer(result)
      draft.clear()
      setProject(stored)
      setBase(stored)
      window.dispatchEvent(new Event('admin-stats-changed'))
      toast.success(id ? 'Project saved' : 'Project created')
      if (!id && stored._id) router.replace(`/admin/projects/${stored._id}`)
    } catch (error) {
      setErrors({ form: errorMessage(error) })
    } finally {
      setSaving(false)
    }
  }
  useSaveShortcut(save)

  const remove = async () => {
    if (!id) return
    const ok = await confirm({ title: 'Delete this project?', body: 'Its card and case-study page disappear from the site. This cannot be undone.' })
    if (!ok) return
    try {
      await api(`/api/projects/${id}`, { method: 'DELETE' })
      draft.clear()
      setBase(project)
      window.dispatchEvent(new Event('admin-stats-changed'))
      toast.success('Project deleted')
      router.push('/admin/projects')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const groups = useMemo(() => {
    const q = techQuery.trim().toLowerCase()
    const map = new Map<string, Skill[]>()
    for (const skill of skills.data || []) {
      if (q && !skill.name.toLowerCase().includes(q)) continue
      const list = map.get(skill.category) || []
      list.push(skill)
      map.set(skill.category, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [skills.data, techQuery])

  const toggleTech = (skillId: string) =>
    set('technologies', project.technologies.includes(skillId) ? project.technologies.filter((t) => t !== skillId) : [...project.technologies, skillId])

  if (loadError) return <ErrorNote message={loadError} onRetry={load} />
  const title = project.title_en || project.title_es

  return (
    <>
      <PageHeader
        back={{ href: '/admin/projects', label: 'Projects' }}
        title={id ? title || 'Untitled project' : 'New project'}
        actions={
          id && project.slug ? (
            <a href={`/${lang}/projects/${project.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-line/15 bg-surface px-4 text-sm font-medium text-fg transition-colors hover:border-line/40">
              View on site <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden="true" />
            </a>
          ) : undefined
        }
      />
      {draft.found && snapshot(draft.found.value) !== saved && !loading && (
        <DraftBanner savedAt={draft.found.savedAt} onRestore={() => { setProject({ ...draft.found!.value, _id: project._id }); draft.dismiss() }} onDiscard={draft.clear} />
      )}
      {errors.form && <div className="mb-6"><ErrorNote message={errors.form} /></div>}

      {loading ? (
        <Panel><SkeletonRows rows={6} /></Panel>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <LangSwitch
              value={lang}
              onChange={switchLang}
              incomplete={{ en: !project.title_en || !project.subtitle_en, es: !project.title_es || !project.subtitle_es || !project.description_es }}
            />
            {lang === 'es' && <p className="-mt-2 text-[13px] text-fg-dim">Empty Spanish fields fall back to the English text on the site.</p>}
            <Field label="Title" error={lang === 'en' ? errors.title : null}>
              {(props) => <Input {...props} lang={lang} value={project[`title_${lang}`]} onChange={(event) => set(`title_${lang}`, event.target.value)} placeholder={lang === 'es' ? project.title_en : 'FloodRisk'} className="h-12 text-[19px] font-semibold tracking-[-0.015em]" />}
            </Field>
            <Field label="Subtitle" error={lang === 'en' ? errors.subtitle : null} hint="One line on the project card: what it is and for whom.">
              {(props) => <Input {...props} lang={lang} value={project[`subtitle_${lang}`]} onChange={(event) => set(`subtitle_${lang}`, event.target.value)} placeholder={lang === 'es' ? project.subtitle_en : ''} />}
            </Field>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-fg-soft">Case study</p>
              <RichText key={lang} ref={editorRef} id={`project-description-${lang}`} label={lang === 'en' ? 'Case study (English)' : 'Case study (Spanish)'} height={480} value={project[`description_${lang}`]} onReady={() => { readyAt.current = Date.now() }} onChange={editorChange} />
            </div>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <Panel className="overflow-hidden">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); upload(event.dataTransfer.files?.[0]) }}
                className={cx('group relative block aspect-video w-full overflow-hidden bg-fg/[0.04] text-left', uploading && 'animate-pulse')}
                aria-label={project.thumbnail ? 'Replace cover image' : 'Upload cover image'}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {project.thumbnail && <img src={project.thumbnail} alt="" className="h-full w-full object-cover" />}
                <span className={cx('absolute inset-0 flex flex-col items-center justify-center gap-2 text-[13px] font-medium transition-opacity', project.thumbnail ? 'bg-navy/70 text-cream opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100' : 'text-fg-soft')}>
                  <ImagePlus size={20} strokeWidth={1.5} aria-hidden="true" />
                  {uploading ? 'Uploading…' : project.thumbnail ? 'Replace cover' : 'Drop or choose a cover image'}
                </span>
              </button>
              <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(',')} className="hidden" onChange={(event) => upload(event.target.files?.[0])} />
              <div className="space-y-4 p-5">
                <Field label="Image description" hint="Read aloud by screen readers. Describe what the image shows.">
                  {(props) => <Input {...props} value={project.thumbnailAlt} onChange={(event) => set('thumbnailAlt', event.target.value)} placeholder="Dashboard showing flood risk by district" />}
                </Field>
                <details className="text-[13px]">
                  <summary className="cursor-pointer text-fg-dim hover:text-fg-soft">Compression <span className="font-mono text-[11px]">q{project.thumbnailOptimization.quality} · e{project.thumbnailOptimization.effort}</span></summary>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="Quality" hint="50–95">
                      {(props) => <Input {...props} type="number" min={50} max={95} value={project.thumbnailOptimization.quality} onChange={(event) => set('thumbnailOptimization', { ...project.thumbnailOptimization, quality: Math.min(95, Math.max(50, Number(event.target.value) || 82)) })} />}
                    </Field>
                    <Field label="Effort" hint="0–6">
                      {(props) => <Input {...props} type="number" min={0} max={6} value={project.thumbnailOptimization.effort} onChange={(event) => set('thumbnailOptimization', { ...project.thumbnailOptimization, effort: Math.min(6, Math.max(0, Number(event.target.value) || 0)) })} />}
                    </Field>
                  </div>
                  <p className="mt-2 text-[12px] text-fg-dim">Applies to the next upload.</p>
                </details>
              </div>
            </Panel>

            <Panel className="space-y-4 p-5">
              <Field label="Live site">
                {(props) => <Input {...props} type="url" inputMode="url" value={project.publicUrl} onChange={(event) => set('publicUrl', event.target.value)} placeholder="https://" />}
              </Field>
              <Field label="Source code">
                {(props) => <Input {...props} type="url" inputMode="url" value={project.githubUrl} onChange={(event) => set('githubUrl', event.target.value)} placeholder="https://github.com/…" />}
              </Field>
              <Field label="Address" hint={id ? 'Changing it breaks links people already shared.' : 'Follows the English title until you edit it.'}>
                {(props) => (
                  <div className="flex items-center rounded-xl border border-line/15 bg-surface focus-within:border-signal/70">
                    <span className="pl-3.5 font-mono text-[12px] text-fg-dim">/projects/</span>
                    <input {...props} value={project.slug} onChange={(event) => { setSlugTouched(true); set('slug', slugify(event.target.value)) }} className="h-10 min-w-0 flex-1 bg-transparent pr-3 font-mono text-[13px] text-fg focus:outline-none" />
                  </div>
                )}
              </Field>
            </Panel>

            <Panel className="overflow-hidden">
              <PanelHeader title="Built with" description={`${project.technologies.length} selected`} />
              <div className="p-4">
                <SearchField value={techQuery} onChange={setTechQuery} placeholder="Filter skills" />
                <div className="mt-3 max-h-[340px] space-y-4 overflow-y-auto pr-1">
                  {skills.loading && !skills.data ? (
                    <SkeletonRows rows={3} />
                  ) : (
                    groups.map(([category, list]) => (
                      <div key={category}>
                        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-dim">{category}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {list.map((skill) => {
                            const on = project.technologies.includes(skill._id)
                            return (
                              <button
                                key={skill._id}
                                type="button"
                                aria-pressed={on}
                                onClick={() => toggleTech(skill._id)}
                                className={cx('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors', on ? 'bg-navy text-cream' : 'border border-line/15 text-fg-soft hover:border-line/40 hover:text-fg')}
                              >
                                {on && <Check size={13} strokeWidth={2} aria-hidden="true" />}
                                {skill.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Panel>

            {id && (
              <Button variant="ghost" icon={Trash2} onClick={remove} className="w-full hover:!text-signal-text">
                Delete project
              </Button>
            )}
          </aside>
        </div>
      )}

      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={id ? load : () => setProject(BLANK)} saveLabel={id ? 'Save changes' : 'Create project'} />
    </>
  )
}
