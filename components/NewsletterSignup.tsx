'use client'

import { useState } from 'react'

interface NewsletterSignupProps {
  compact?: boolean
  className?: string
}

export default function NewsletterSignup({ compact = false, className = '' }: NewsletterSignupProps) {
  const [email, setEmail] = useState('')
  const [lang, setLang] = useState<'en' | 'es'>('en')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const submit = async () => {
    if (!email || status === 'loading') return
    setStatus('loading'); setMsg('')
    try {
      const res = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, language: lang }) })
      if (res.ok) {
        setStatus('ok')
        setMsg('Subscribed! You will receive new blogs via email.')
        setEmail('')
      }
      else {
        const d = await res.json().catch(() => ({}))
        setStatus('error')
        setMsg(d.error || 'Subscription failed')
      }
    } catch {
      setStatus('error'); setMsg('Subscription failed')
    }
  }

  return (
    <div className={`border rounded p-4 bg-white shadow-sm ${!compact ? 'md:bg-white/80' : ''} ${className}`.trim()}>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Language</label>
          <select
            value={lang}
            onChange={e => setLang(e.target.value as any)}
            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
        <button
          onClick={submit}
          disabled={!email || status === 'loading'}
          className="h-10 px-4 rounded-md bg-primary text-white text-sm font-medium transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Submitting...' : 'Subscribe'}
        </button>
      </div>
      {msg && <p className={`text-sm mt-2 ${status === 'error' ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}
      {!compact && <p className="text-xs text-muted-foreground mt-1">We only email when a new blog is published. Unsubscribe anytime.</p>}
    </div>
  )
}

