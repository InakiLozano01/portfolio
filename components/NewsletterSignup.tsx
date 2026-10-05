'use client'

import { useEffect, useId, useState } from 'react'

interface NewsletterSignupProps {
  compact?: boolean
  className?: string
  lang?: 'en' | 'es'
  dict?: any
}

export default function NewsletterSignup({ compact = false, className = '', lang = 'en', dict = {} }: NewsletterSignupProps) {
  const [email, setEmail] = useState('')
  const [selectedLang, setSelectedLang] = useState<'en' | 'es'>(lang)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const fieldId = useId()
  const emailId = `${fieldId}-email`
  const langId = `${fieldId}-language`

  // Keep selected language in sync with current page language
  useEffect(() => {
    setSelectedLang(lang)
  }, [lang])

  const submit = async () => {
    if (!email || status === 'loading') return
    setStatus('loading'); setMsg('')
    try {
      const res = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, language: selectedLang }) })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        setStatus('ok')
        setMsg(data.pending
          ? (dict?.confirmPending || 'Almost there! Check your inbox to confirm your subscription.')
          : (dict?.success || 'Subscribed! You will receive new blogs via email.'))
        setEmail('')
      }
      else {
        const d = await res.json().catch(() => ({}))
        setStatus('error')
        setMsg(d.error || dict?.error || 'Subscription failed')
      }
    } catch {
      setStatus('error'); setMsg(dict?.error || 'Subscription failed')
    }
  }

  return (
    <div className={`border border-navy/15 rounded-xl p-5 bg-white text-navy ${className}`.trim()}>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <label htmlFor={emailId} className="block text-sm mb-1">{dict?.emailLabel || 'Email'}</label>
          <input
            id={emailId}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={dict?.emailPlaceholder || 'you@example.com'}
            className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>
        <div>
          <label htmlFor={langId} className="block text-sm mb-1">{dict?.languageLabel || 'Language'}</label>
          <select
            id={langId}
            value={selectedLang}
            onChange={e => setSelectedLang(e.target.value as any)}
            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <option value="en">{dict?.langEnglish || 'English'}</option>
            <option value="es">{dict?.langSpanish || 'Español'}</option>
          </select>
        </div>
        <button
          onClick={submit}
          disabled={!email || status === 'loading'}
          className="h-10 px-4 rounded-md bg-primary text-white text-sm font-medium transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? (dict?.submitting || 'Submitting...') : (dict?.subscribe || 'Subscribe')}
        </button>
      </div>
      {/* Stable live region so screen readers announce the result of submitting. */}
      <div role="status" aria-live="polite" aria-atomic="true">
        {msg && <p className={`text-sm mt-2 ${status === 'error' ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}
      </div>
      {!compact && <p className="text-xs text-muted-foreground mt-1">{dict?.disclaimer || 'We only email when a new blog is published. Unsubscribe anytime.'}</p>}
    </div>
  )
}
