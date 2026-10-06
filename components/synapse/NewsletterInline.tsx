'use client'

import { useEffect, useId, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { Lang } from './content'

/** Double opt-in newsletter form; same contract as POST /api/subscribe used elsewhere. */
export default function NewsletterInline({ lang = 'en', dict = {} }: { lang?: Lang; dict?: any }) {
    const [email, setEmail] = useState('')
    const [language, setLanguage] = useState<Lang>(lang)
    const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
    const [message, setMessage] = useState('')
    const id = useId()

    useEffect(() => setLanguage(lang), [lang])

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!email || status === 'loading') return
        setStatus('loading')
        setMessage('')
        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, language }),
            })
            const data = await res.json().catch(() => ({}))
            if (res.ok) {
                setStatus('ok')
                setMessage(data.pending
                    ? dict.confirmPending || 'Almost there! Check your inbox to confirm your subscription.'
                    : dict.success || 'Subscribed! You will receive new blogs via email.')
                setEmail('')
            } else {
                setStatus('error')
                setMessage(data.error || dict.error || 'Subscription failed')
            }
        } catch {
            setStatus('error')
            setMessage(dict.error || 'Subscription failed')
        }
    }

    return (
        <form onSubmit={submit} className="w-full" noValidate>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                    <label htmlFor={`${id}-email`} className="mb-2 block text-sm text-fg-soft">{dict.emailLabel || 'Email'}</label>
                    <input
                        id={`${id}-email`}
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder={dict.emailPlaceholder || 'you@example.com'}
                        className="h-12 w-full rounded-full border border-line/15 bg-surface px-5 text-[15px] text-fg placeholder:text-fg-dim transition-[border-color,box-shadow] focus:border-signal/70 focus:outline-none"
                    />
                </div>
                <div>
                    <label htmlFor={`${id}-lang`} className="mb-2 block text-sm text-fg-soft">{dict.languageLabel || 'Language'}</label>
                    <select
                        id={`${id}-lang`}
                        value={language}
                        onChange={(event) => setLanguage(event.target.value as Lang)}
                        className="h-12 w-full rounded-full border border-line/15 bg-surface px-5 text-[15px] text-fg focus:border-signal/70 focus:outline-none sm:w-auto"
                    >
                        <option value="en">{dict.langEnglish || 'English'}</option>
                        <option value="es">{dict.langSpanish || 'Español'}</option>
                    </select>
                </div>
                <button
                    type="submit"
                    disabled={!email || status === 'loading'}
                    className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-action px-6 text-[15px] font-medium text-action-fg transition-[background-color,opacity] hover:bg-signal hover:text-navy disabled:cursor-not-allowed disabled:bg-fg/[0.1] disabled:text-fg-dim"
                >
                    {status === 'loading' ? dict.submitting || 'Submitting...' : dict.subscribe || 'Subscribe'}
                    <ArrowRight size={16} strokeWidth={1.75} className="transition-transform group-hover:translate-x-0.5" />
                </button>
            </div>
            <div role="status" aria-live="polite" aria-atomic="true">
                {message && <p className={`mt-3 text-sm ${status === 'error' ? 'text-signal-text' : 'text-fg'}`}>{message}</p>}
            </div>
            {dict.disclaimer !== "" && <p className="mt-3 text-sm text-fg-dim">{dict.disclaimer || "We only email when a new blog is published. Unsubscribe anytime."}</p>}
        </form>
    )
}
