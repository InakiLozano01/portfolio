'use client'

import { useState } from 'react'

export default function NewsletterSignup({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('')
  const [lang, setLang] = useState<'en'|'es'>('en')
  const [status, setStatus] = useState<'idle'|'loading'|'ok'|'error'>('idle')
  const [msg, setMsg] = useState('')

  const submit = async () => {
    setStatus('loading'); setMsg('')
    try {
      const res = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, language: lang }) })
      if (res.ok) { setStatus('ok'); setMsg('Subscribed! You will receive new blogs via email.') }
      else { const d = await res.json().catch(() => ({})); setStatus('error'); setMsg(d.error || 'Subscription failed') }
    } catch { setStatus('error'); setMsg('Subscription failed') }
  }

  return (
    <div className={`border rounded p-4 ${compact ? '' : 'bg-primary/5'}`}> 
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <label className="block text-sm mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full p-2 border rounded text-black" />
        </div>
        <div>
          <label className="block text-sm mb-1">Language</label>
          <select value={lang} onChange={e => setLang(e.target.value as any)} className="p-2 border rounded text-black">
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
        <button onClick={submit} disabled={!email || status==='loading'} className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50">{status==='loading'?'Submitting...':'Subscribe'}</button>
      </div>
      {msg && <p className={`text-sm mt-2 ${status==='error'?'text-red-600':'text-green-600'}`}>{msg}</p>}
      {!compact && <p className="text-xs text-muted-foreground mt-1">We only email when a new blog is published. Unsubscribe anytime.</p>}
    </div>
  )
}

