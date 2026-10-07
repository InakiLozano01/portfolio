'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArrowUpRight, FileDown, Send, Sparkles, Trash2, Upload } from 'lucide-react'
import { slugify } from '@/lib/utils'
import { assertBlogPayloadCanBeSaved } from '@/lib/blog-payload-guard'
import { Button, ErrorNote, Field, Input, PageHeader, Panel, PanelHeader, SaveBar, SkeletonRows, Status, Switch, Textarea, formatDateTime, useSaveShortcut, useUnsavedGuard } from '../console/kit'
import { api, errorMessage, useConfirm } from '../console/data'
import { DraftBanner, LangSwitch, RichText, TagInput, useLocalDraft, type Lang, type TinyMCEHandle } from '../console/editing'
import NewsletterDialog from './NewsletterDialog'

export interface Post {
  _id?: string
  title_en: string
  title_es: string
  subtitle_en: string
  subtitle_es: string
  content_en: string
  content_es: string
  footer_en: string
  footer_es: string
  bibliography_en: string
  bibliography_es: string
  slug: string
  tags: string[]
  published: boolean
  pdf_en?: string
  pdf_es?: string
  createdAt?: string
  updatedAt?: string
}

const BLANK: Post = {
  title_en: '', title_es: '', subtitle_en: '', subtitle_es: '', content_en: '', content_es: '',
  footer_en: '', footer_es: '', bibliography_en: '', bibliography_es: '', slug: '', tags: [], published: false,
}

const EDITABLE: (keyof Post)[] = ['title_en', 'title_es', 'subtitle_en', 'subtitle_es', 'content_en', 'content_es', 'footer_en', 'footer_es', 'bibliography_en', 'bibliography_es', 'slug', 'tags', 'published']
const snapshot = (post: Post) => JSON.stringify(EDITABLE.map((key) => post[key]))

function fromServer(blog: Record<string, any>): Post {
  return {
    ...BLANK,
    _id: blog._id,
    title_en: blog.title_en || blog.title || '',
    title_es: blog.title_es || '',
    subtitle_en: blog.subtitle_en || blog.subtitle || '',
    subtitle_es: blog.subtitle_es || '',
    content_en: blog.content_en || blog.content || '',
    content_es: blog.content_es || '',
    footer_en: blog.footer_en || blog.footer || '',
    footer_es: blog.footer_es || '',
    bibliography_en: blog.bibliography_en || blog.bibliography || '',
    bibliography_es: blog.bibliography_es || '',
    slug: blog.slug || '',
    tags: blog.tags || [],
    published: blog.published === true,
    pdf_en: blog.pdf_en,
    pdf_es: blog.pdf_es,
    createdAt: blog.createdAt,
    updatedAt: blog.updatedAt,
  }
}

const words = (html: string) => (html.replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length

/** One editor for every post: write both languages, publish, attach PDFs and send it as a newsletter. */
export default function PostEditor({ id }: { id?: string }) {
  const router = useRouter()
  const confirm = useConfirm()
  const editorRef = useRef<TinyMCEHandle | null>(null)
  const [post, setPost] = useState<Post>(BLANK)
  const [base, setBase] = useState<Post>(BLANK)
  const saved = snapshot(base)
  const current = useRef<Post>(BLANK)
  const readyAt = useRef(0)
  const [wasPublished, setWasPublished] = useState(false)
  const [loading, setLoading] = useState(!!id)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [lang, setLang] = useState<Lang>('en')
  const [slugTouched, setSlugTouched] = useState(false)
  const [pdfBusy, setPdfBusy] = useState<string | null>(null)
  const [newsletterOpen, setNewsletterOpen] = useState(false)
  const uploadRefs = { en: useRef<HTMLInputElement | null>(null), es: useRef<HTMLInputElement | null>(null) }

  current.current = post
  const dirty = snapshot(post) !== saved
  // TinyMCE re-serialises the HTML it is given right after init; that is not an edit.
  const editorChange = (value: string) => {
    const key = `content_${lang}` as const
    if (Date.now() - readyAt.current < 1200) setBase((b) => (b[key] === current.current[key] ? { ...b, [key]: value } : b))
    set(key, value)
  }
  const draft = useLocalDraft<Post>(`console:post:${id || 'new'}`, post, dirty)
  useUnsavedGuard(dirty)

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    setLoadError(null)
    api(`/api/blogs/${id}`)
      .then((blog) => {
        const next = fromServer(blog)
        setPost(next)
        setBase(next)
        setWasPublished(next.published)
        setSlugTouched(true)
      })
      .catch((error) => setLoadError(errorMessage(error)))
      .finally(() => setLoading(false))
  }, [id])
  useEffect(load, [load])

  const set = <K extends keyof Post>(key: K, value: Post[K]) =>
    setPost((prev) => {
      const next = { ...prev, [key]: value }
      // A new post's address follows its English title until it is edited by hand.
      if (!slugTouched && (key === 'title_en' || key === 'title_es')) next.slug = slugify(next.title_en || next.title_es)
      return next
    })

  // Pasted images upload before the language switches, so nothing embedded is left behind.
  const switchLang = async (next: Lang) => {
    if (next === lang) return
    try {
      const content = await editorRef.current?.uploadImages()
      if (typeof content === 'string') setPost((prev) => ({ ...prev, [`content_${lang}`]: content }))
    } catch (error) {
      toast.error(errorMessage(error))
    }
    setLang(next)
  }

  const save = async () => {
    if (saving) return
    setFormError(null)
    // English is the base language: Spanish falls back to it, so it cannot be empty.
    const englishBody = lang === 'en' ? editorRef.current?.getContent() ?? post.content_en : post.content_en
    const missing = [!post.title_en.trim() && 'title', !post.subtitle_en.trim() && 'subtitle', !words(englishBody) && 'body'].filter(Boolean)
    if (missing.length) {
      setFormError(`Write the English ${missing.join(', ')} before saving; Spanish can follow later.`)
      setLang('en')
      return
    }
    setSaving(true)
    try {
      const content = await editorRef.current?.uploadImages()
      const current = typeof content === 'string' ? { ...post, [`content_${lang}`]: content } : post
      const slug = slugify(current.slug || current.title_en || current.title_es)
      const payload = {
        ...current,
        slug,
        title: current.title_en || current.title_es,
        subtitle: current.subtitle_en || current.subtitle_es,
        content: current.content_en || current.content_es,
        footer: current.footer_en || current.footer_es,
        bibliography: current.bibliography_en || current.bibliography_es,
      }
      assertBlogPayloadCanBeSaved(payload as Record<string, unknown>)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 20_000)
      const result = await api(id ? `/api/blogs/${id}` : '/api/blogs', { method: id ? 'PUT' : 'POST', body: payload, signal: controller.signal }).finally(() => clearTimeout(timer))
      const next = fromServer(result)
      draft.clear()
      setPost(next)
      setBase(next)
      window.dispatchEvent(new Event('admin-stats-changed'))
      const firstPublish = next.published && !wasPublished
      setWasPublished(next.published)
      toast.success(firstPublish ? 'Published. Subscribers are being emailed.' : id ? 'Post saved' : 'Post created')
      if (!id && next._id) router.replace(`/admin/posts/${next._id}`)
    } catch (error) {
      setFormError(error instanceof Error && error.name === 'AbortError' ? 'Saving took too long. Check your connection, then save again; your edits are still here.' : errorMessage(error))
    } finally {
      setSaving(false)
    }
  }
  useSaveShortcut(save)

  const remove = async () => {
    if (!id) return
    const ok = await confirm({ title: 'Delete this post?', body: 'It disappears from the site and its comments stay orphaned. This cannot be undone.' })
    if (!ok) return
    try {
      await api(`/api/blogs/${id}`, { method: 'DELETE' })
      draft.clear()
      setBase(post)
      window.dispatchEvent(new Event('admin-stats-changed'))
      toast.success('Post deleted')
      router.push('/admin/posts')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const generatePdf = async (which: Lang | 'both') => {
    if (!id) return
    setPdfBusy(`gen-${which}`)
    try {
      const data = await api<{ pdf_en?: string; pdf_es?: string }>(`/api/blogs/${id}/pdf/generate?lang=${which}`, { method: 'POST' })
      setPost((prev) => ({ ...prev, pdf_en: data.pdf_en ?? prev.pdf_en, pdf_es: data.pdf_es ?? prev.pdf_es }))
      toast.success(which === 'both' ? 'Both PDFs generated' : `${which.toUpperCase()} PDF generated`)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setPdfBusy(null)
    }
  }

  const uploadPdf = async (which: Lang, file: File | undefined) => {
    if (!id || !file) return
    setPdfBusy(`up-${which}`)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('lang', which)
      const data = await api<{ path: string }>(`/api/blogs/${id}/pdf`, { method: 'POST', form })
      setPost((prev) => ({ ...prev, [`pdf_${which}`]: data.path }))
      toast.success(`${which.toUpperCase()} PDF uploaded`)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setPdfBusy(null)
      if (uploadRefs[which].current) uploadRefs[which].current.value = ''
    }
  }

  const incomplete = useMemo(
    () => ({
      en: !post.title_en.trim() || !post.subtitle_en.trim() || !post.content_en.trim(),
      es: !post.title_es.trim() || !post.subtitle_es.trim() || !post.content_es.trim(),
    }),
    [post],
  )
  const count = words(post[`content_${lang}`])
  const title = post.title_en || post.title_es

  if (loadError) return <ErrorNote message={loadError} onRetry={load} />

  return (
    <>
      <PageHeader
        back={{ href: '/admin/posts', label: 'Writing' }}
        title={id ? title || 'Untitled post' : 'New post'}
        actions={
          id && wasPublished && post.slug ? (
            <a href={`/${lang}/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-line/15 bg-surface px-4 text-sm font-medium text-fg transition-colors hover:border-line/40">
              View on site <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden="true" />
            </a>
          ) : undefined
        }
      />

      {draft.found && draft.found.value && snapshot(draft.found.value) !== saved && !loading && (
        <DraftBanner
          savedAt={draft.found.savedAt}
          onRestore={() => { setPost({ ...draft.found!.value, _id: post._id, pdf_en: post.pdf_en, pdf_es: post.pdf_es }); draft.dismiss() }}
          onDiscard={draft.clear}
        />
      )}
      {formError && <div className="mb-6"><ErrorNote message={formError} /></div>}

      {loading ? (
        <Panel><SkeletonRows rows={6} /></Panel>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <LangSwitch value={lang} onChange={switchLang} incomplete={incomplete} />
              <p className="font-mono text-[12px] tabular text-fg-dim">
                {count} words · {Math.max(1, Math.round(count / 220))} min read
              </p>
            </div>
            {lang === 'es' && (
              <p className="-mt-2 text-[13px] text-fg-dim">Spanish fields left empty are filled with the English text when you save.</p>
            )}

            <Field label="Title">
              {(props) => (
                <Input {...props} lang={lang} value={post[`title_${lang}`]} onChange={(event) => set(`title_${lang}`, event.target.value)} placeholder={lang === 'es' ? post.title_en || 'Título' : 'A title that says what the essay argues'} className="h-12 text-[19px] font-semibold tracking-[-0.015em]" />
              )}
            </Field>
            <Field label="Subtitle" hint="One or two sentences. It appears under the title, in lists and in the newsletter.">
              {(props) => <Textarea {...props} lang={lang} rows={2} value={post[`subtitle_${lang}`]} onChange={(event) => set(`subtitle_${lang}`, event.target.value)} placeholder={lang === 'es' ? post.subtitle_en : ''} className="min-h-[68px]" />}
            </Field>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-fg-soft">Body</p>
              <RichText
                key={lang}
                ref={editorRef}
                id={`post-body-${lang}`}
                label={lang === 'en' ? 'Post body (English)' : 'Post body (Spanish)'}
                height={620}
                value={post[`content_${lang}`]}
                onReady={() => { readyAt.current = Date.now() }} onChange={editorChange}
              />
            </div>
            <details className="group rounded-2xl border border-line/10 bg-surface" open={!!(post[`footer_${lang}`] || post[`bibliography_${lang}`])}>
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[14px] font-medium text-fg">
                Notes and references
                <span className="text-[12px] font-normal text-fg-dim group-open:hidden">Footer note and bibliography</span>
              </summary>
              <div className="space-y-5 border-t border-line/[0.07] px-5 py-5">
                <Field label="Footer note">
                  {(props) => <Textarea {...props} lang={lang} rows={3} value={post[`footer_${lang}`]} onChange={(event) => set(`footer_${lang}`, event.target.value)} />}
                </Field>
                <Field label="Bibliography" hint="One reference per line.">
                  {(props) => <Textarea {...props} lang={lang} rows={5} value={post[`bibliography_${lang}`]} onChange={(event) => set(`bibliography_${lang}`, event.target.value)} className="font-mono text-[13px]" />}
                </Field>
              </div>
            </details>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <Panel className="p-5">
              <Switch
                checked={post.published}
                onChange={(value) => set('published', value)}
                label={post.published ? 'Published' : 'Draft'}
                description={
                  post.published && !wasPublished
                    ? 'Saving publishes it and emails it to confirmed subscribers.'
                    : post.published
                      ? 'Visible to everyone.'
                      : 'Only you can see it.'
                }
              />
              {(post.createdAt || post.updatedAt) && (
                <dl className="mt-4 space-y-1 border-t border-line/[0.07] pt-4 text-[12px]">
                  {post.createdAt && <div className="flex justify-between gap-3"><dt className="text-fg-dim">Created</dt><dd className="font-mono tabular text-fg-soft">{formatDateTime(post.createdAt)}</dd></div>}
                  {post.updatedAt && <div className="flex justify-between gap-3"><dt className="text-fg-dim">Last saved</dt><dd className="font-mono tabular text-fg-soft">{formatDateTime(post.updatedAt)}</dd></div>}
                </dl>
              )}
            </Panel>

            <Panel className="space-y-5 p-5">
              <Field label="Address" hint={wasPublished ? 'Changing it breaks links people already shared.' : 'Follows the title until you edit it.'}>
                {(props) => (
                  <div className="flex items-center rounded-xl border border-line/15 bg-surface focus-within:border-signal/70">
                    <span className="pl-3.5 font-mono text-[12px] text-fg-dim">/blog/</span>
                    <input {...props} value={post.slug} onChange={(event) => { setSlugTouched(true); set('slug', slugify(event.target.value)) }} className="h-10 min-w-0 flex-1 bg-transparent pr-3 font-mono text-[13px] text-fg focus:outline-none" />
                  </div>
                )}
              </Field>
              <Field label="Tags">
                {(props) => <TagInput id={props.id} value={post.tags} onChange={(tags) => set('tags', tags)} />}
              </Field>
            </Panel>

            <Panel className="overflow-hidden">
              <PanelHeader title="PDF editions" description={id ? 'Readers can download these from the post.' : 'Save the post first.'} />
              <ul className="divide-y divide-line/[0.07]">
                {(['en', 'es'] as const).map((which) => {
                  const path = post[`pdf_${which}`]
                  return (
                    <li key={which} className="flex items-center gap-2 px-5 py-3">
                      <span className="w-6 font-mono text-[11px] font-medium uppercase text-fg-dim">{which}</span>
                      {path ? (
                        <a href={path} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 flex-1 items-center gap-1.5 truncate text-[13px] font-medium text-fg hover:underline">
                          <FileDown size={14} strokeWidth={1.75} aria-hidden="true" /> Open PDF
                        </a>
                      ) : (
                        <span className="flex-1 text-[13px] text-fg-dim">None yet</span>
                      )}
                      <Button size="sm" variant="ghost" icon={Sparkles} disabled={!id || dirty || !!pdfBusy} loading={pdfBusy === `gen-${which}`} onClick={() => generatePdf(which)} title={dirty ? 'Save first' : undefined}>
                        Generate
                      </Button>
                      <input ref={uploadRefs[which]} type="file" accept="application/pdf" className="hidden" onChange={(event) => uploadPdf(which, event.target.files?.[0])} />
                      <Button size="sm" variant="ghost" icon={Upload} disabled={!id || !!pdfBusy} loading={pdfBusy === `up-${which}`} onClick={() => uploadRefs[which].current?.click()} aria-label={`Upload ${which.toUpperCase()} PDF`}>
                        <span className="sr-only">Upload</span>
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </Panel>

            <Panel className="p-5">
              <h2 className="text-[15px] font-semibold text-fg">Newsletter</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-fg-dim">Choose recipients, preview the email in both languages, then send.</p>
              <Button className="mt-4 w-full" icon={Send} disabled={!id || dirty} onClick={() => setNewsletterOpen(true)} title={dirty ? 'Save first' : undefined}>
                Email to subscribers…
              </Button>
              {!post.published && id && <p className="mt-2"><Status tone="idle">It is still a draft</Status></p>}
            </Panel>

            {id && (
              <Button variant="ghost" icon={Trash2} onClick={remove} className="w-full hover:!text-signal-text">
                Delete post
              </Button>
            )}
          </aside>
        </div>
      )}

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={save}
        onDiscard={id ? load : () => setPost(BLANK)}
        saveLabel={post.published && !wasPublished ? 'Save and publish' : id ? 'Save changes' : 'Create post'}
      />
      {id && newsletterOpen && <NewsletterDialog postId={id} onClose={() => setNewsletterOpen(false)} />}
    </>
  )
}
