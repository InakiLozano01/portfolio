'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { Eye, EyeOff, MailCheck, RefreshCw, Send } from 'lucide-react'
import { Button, Field, Input, PageHeader, Panel, PanelHeader, Select, Status, cx } from '../console/kit'
import { api, errorMessage } from '../console/data'

function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const strength = next.length >= 20 ? 3 : next.length >= 16 ? 2 : next.length >= 12 ? 1 : 0

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (next.length < 12) return setError('Use at least 12 characters. A few unrelated words work well.')
    if (next !== repeat) return setError('The two new passwords do not match.')
    setBusy(true)
    try {
      await api('/api/admin/password', { method: 'POST', body: { currentPassword: current, newPassword: next } })
      toast.success('Password changed. Sign in again with the new one.')
      setTimeout(() => signOut({ callbackUrl: '/admin/login' }), 1200)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 p-5 sm:p-6" noValidate>
      <Field label="Current password">
        {(props) => <Input {...props} type={show ? 'text' : 'password'} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />}
      </Field>
      <Field
        label="New password"
        aside={
          <button type="button" onClick={() => setShow((v) => !v)} className="inline-flex items-center gap-1 text-[12px] text-fg-dim hover:text-fg">
            {show ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />} {show ? 'Hide' : 'Show'}
          </button>
        }
        hint="At least 12 characters. Length matters more than symbols."
      >
        {(props) => <Input {...props} type={show ? 'text' : 'password'} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />}
      </Field>
      <div aria-hidden="true" className="flex gap-1">
        {[1, 2, 3].map((level) => (
          <span key={level} className={cx('h-1 flex-1 rounded-full transition-colors', strength >= level ? 'bg-navy' : 'bg-fg/10')} />
        ))}
      </div>
      <Field label="Repeat new password" error={repeat && next !== repeat ? 'Does not match yet' : null}>
        {(props) => <Input {...props} type={show ? 'text' : 'password'} autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />}
      </Field>
      {error && <p role="alert" className="text-[13px] font-medium text-signal-text">{error}</p>}
      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-[12px] text-fg-dim">Every signed-in session ends when it changes.</p>
        <Button type="submit" variant="primary" loading={busy} disabled={!current || !next || !repeat}>Change password</Button>
      </div>
    </form>
  )
}

function EmailCheck() {
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null)
  const [busy, setBusy] = useState<'check' | 'send' | null>(null)
  const check = async () => {
    setBusy('check')
    try {
      const result = await api<{ emailConfigured: boolean; message: string }>('/api/contact/test')
      setState({ ok: result.emailConfigured, message: result.emailConfigured ? 'Connected to the mail server.' : 'The mail server refused the connection. Check the SMTP settings on the server.' })
    } catch (err) {
      setState({ ok: false, message: errorMessage(err) })
    } finally {
      setBusy(null)
    }
  }
  const send = async () => {
    setBusy('send')
    try {
      const result = await api<{ success: boolean; message: string }>('/api/contact/test', { method: 'POST' })
      if (result.success) toast.success('Test message sent. Check your inbox.')
      else toast.error(result.message || 'The test message was not sent.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="space-y-4 p-5 sm:p-6">
      <p className="text-[13px] leading-relaxed text-fg-soft">Contact-form messages, comment alerts and newsletters all go through this connection.</p>
      {state && <Status tone={state.ok ? 'live' : 'attention'}>{state.message}</Status>}
      <div className="flex flex-wrap gap-2">
        <Button icon={MailCheck} loading={busy === 'check'} onClick={check}>Check connection</Button>
        <Button icon={Send} loading={busy === 'send'} onClick={send}>Send a test message</Button>
      </div>
    </div>
  )
}

function CacheRefresh() {
  const [type, setType] = useState('all')
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try {
      const result = await api<{ message?: string }>('/api/cache/refresh', { method: 'POST', body: { cacheType: type } })
      toast.success(result.message || 'Cache refreshed')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-4 p-5 sm:p-6">
      <p className="text-[13px] leading-relaxed text-fg-soft">Saving already refreshes what changed. Use this only if the site still shows old content.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label="What to refresh" value={type} onChange={(e) => setType(e.target.value)} className="w-auto">
          <option value="all">Everything</option>
          <option value="sections">Site pages</option>
          <option value="projects">Projects</option>
          <option value="skills">Skills</option>
          <option value="blogs">Posts</option>
        </Select>
        <Button icon={RefreshCw} loading={busy} onClick={run}>Refresh</Button>
      </div>
    </div>
  )
}

/** Account and the few switches the server exposes. */
export default function Settings({ user }: { user: { name: string; email: string } }) {
  return (
    <>
      <PageHeader title="Settings" description={`Signed in as ${user.name} (${user.email}). Sessions end after 30 idle minutes.`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="lg:row-span-2">
          <PanelHeader title="Password" />
          <PasswordForm />
        </Panel>
        <Panel>
          <PanelHeader title="Email delivery" />
          <EmailCheck />
        </Panel>
        <Panel>
          <PanelHeader title="Site cache" />
          <CacheRefresh />
        </Panel>
      </div>
    </>
  )
}
