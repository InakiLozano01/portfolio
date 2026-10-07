'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArrowUpRight, FileText, Upload } from 'lucide-react'
import { Button, PageHeader, Panel, PanelHeader, cx, formatDateTime } from '../console/kit'
import { api, errorMessage } from '../console/data'

const MB = 1024 * 1024
const size = (bytes: number) => (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

interface Spec {
  key: 'pfp' | 'cv'
  title: string
  description: string
  path: string
  accept: string[]
  max: number
  endpoint: string
}

const SPECS: Spec[] = [
  { key: 'pfp', title: 'Portrait', description: 'The photo in the about section. Cropped to a 512 px square.', path: '/pfp.jpg', accept: ['image/jpeg', 'image/png', 'image/webp'], max: 4 * MB, endpoint: '/api/upload/pfp' },
  { key: 'cv', title: 'CV', description: 'The PDF behind every “Download CV” button.', path: '/CV.pdf', accept: ['application/pdf'], max: 8 * MB, endpoint: '/api/upload/cv' },
]

function Asset({ spec }: { spec: Spec }) {
  const input = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [meta, setMeta] = useState<{ bytes?: number; modified?: string } | null>(null)
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${spec.path}?v=${version}`, { method: 'HEAD', cache: 'no-store' })
      .then((res) => setMeta(res.ok ? { bytes: Number(res.headers.get('content-length')) || undefined, modified: res.headers.get('last-modified') || undefined } : null))
      .catch(() => setMeta(null))
  }, [spec.path, version])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const choose = (next: File | undefined) => {
    setError(null)
    if (!next) return
    if (!spec.accept.includes(next.type)) return setError(spec.key === 'cv' ? 'Choose a PDF.' : 'Choose a JPEG, PNG or WebP image.')
    if (next.size > spec.max) return setError(`That file is ${size(next.size)}; the limit is ${size(spec.max)}.`)
    setFile(next)
    if (spec.key === 'pfp') setPreview(URL.createObjectURL(next))
  }

  const upload = async () => {
    if (!file) return
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      await api(spec.endpoint, { method: 'POST', form })
      setFile(null)
      setPreview(null)
      setVersion(Date.now())
      toast.success(`${spec.title} replaced on the site`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <Panel className="flex flex-col overflow-hidden">
      <PanelHeader
        title={spec.title}
        description={spec.description}
        actions={
          <a href={spec.path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-fg-soft hover:text-fg">
            Open <ArrowUpRight size={13} strokeWidth={1.75} aria-hidden="true" />
          </a>
        }
      />
      <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-center gap-5">
          {spec.key === 'pfp' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview || `${spec.path}?v=${version}`} alt={preview ? 'New portrait preview' : 'Current portrait'} className="h-24 w-24 shrink-0 rounded-full object-cover ring-1 ring-line/15" />
          ) : (
            <span className="grid h-24 w-20 shrink-0 place-items-center rounded-xl border border-line/15 text-fg-dim">
              <FileText size={28} strokeWidth={1.25} aria-hidden="true" />
            </span>
          )}
          <dl className="min-w-0 space-y-1 text-[13px]">
            <div className="flex gap-2"><dt className="text-fg-dim">{file ? 'New file' : 'Live file'}</dt><dd className="truncate font-mono text-[12px] text-fg">{file ? file.name : spec.path}</dd></div>
            <div className="flex gap-2"><dt className="text-fg-dim">Size</dt><dd className="font-mono text-[12px] text-fg-soft">{file ? size(file.size) : meta?.bytes ? size(meta.bytes) : '–'}</dd></div>
            {!file && meta?.modified && <div className="flex gap-2"><dt className="text-fg-dim">Updated</dt><dd className="font-mono text-[12px] text-fg-soft">{formatDateTime(meta.modified)}</dd></div>}
          </dl>
        </div>
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files?.[0]) }}
          className={cx('flex flex-col items-center gap-1.5 rounded-2xl border border-dashed px-4 py-6 text-center text-[13px] transition-colors', error ? 'border-signal/60' : 'border-line/20 hover:border-line/45')}
        >
          <Upload size={18} strokeWidth={1.5} className="text-fg-dim" aria-hidden="true" />
          <span className="font-medium text-fg">Drop a file or choose one</span>
          <span className="text-fg-dim">{spec.key === 'cv' ? 'PDF' : 'JPEG, PNG or WebP'}, up to {size(spec.max)}</span>
        </button>
        <input ref={input} type="file" accept={spec.accept.join(',')} className="hidden" onChange={(event) => choose(event.target.files?.[0])} />
        {error && <p role="alert" className="text-[13px] text-signal-text">{error}</p>}
        {file && (
          <div className="mt-auto flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setFile(null); setPreview(null) }}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={upload}>Replace {spec.title.toLowerCase()}</Button>
          </div>
        )}
      </div>
    </Panel>
  )
}

/** The two files the site serves as-is: your portrait and your CV. */
export default function Files() {
  return (
    <>
      <PageHeader title="Files" description="Replacing a file updates it on the site at once; the old one is overwritten." />
      <div className="grid gap-6 md:grid-cols-2">
        {SPECS.map((spec) => <Asset key={spec.key} spec={spec} />)}
      </div>
    </>
  )
}
