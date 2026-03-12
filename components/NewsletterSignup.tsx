'use client'

import { useEffect, useState } from 'react'

interface NewsletterSignupProps {
	compact?: boolean
	className?: string
	lang?: 'en' | 'es'
}

export default function NewsletterSignup({ compact = false, className = '', lang = 'en' }: NewsletterSignupProps) {
	const [email, setEmail] = useState('')
	const [selectedLang, setSelectedLang] = useState<'en' | 'es'>(lang)
	const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
	const [msg, setMsg] = useState('')

	useEffect(() => {
		setSelectedLang(lang)
	}, [lang])

	const submit = async () => {
		if (!email || status === 'loading') return
		setStatus('loading')
		setMsg('')
		try {
			const res = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, language: selectedLang }),
			})
			if (res.ok) {
				setStatus('ok')
				setMsg(lang === 'es' ? 'Suscrito. Recibiras nuevos blogs por email.' : 'Subscribed. You will receive new blogs via email.')
				setEmail('')
			} else {
				const d = await res.json().catch(() => ({}))
				setStatus('error')
				setMsg(d.error || (lang === 'es' ? 'Error en la suscripcion' : 'Subscription failed'))
			}
		} catch {
			setStatus('error')
			setMsg(lang === 'es' ? 'Error en la suscripcion' : 'Subscription failed')
		}
	}

	return (
		<div className={`rounded-xl p-4 ${className}`.trim()}>
			<div className="flex flex-col sm:flex-row gap-2 sm:items-end">
				<div className="flex-1">
					<label className="block text-xs font-medium text-navy/50 mb-1">Email</label>
					<input
						type="email"
						value={email}
						onChange={e => setEmail(e.target.value)}
						placeholder="you@example.com"
						className="w-full h-9 rounded-lg border border-navy/10 bg-white px-3 text-sm text-navy placeholder:text-navy/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-bordeaux/30"
					/>
				</div>
				<div>
					<label className="block text-xs font-medium text-navy/50 mb-1">
						{lang === 'es' ? 'Idioma' : 'Language'}
					</label>
					<select
						value={selectedLang}
						onChange={e => setSelectedLang(e.target.value as any)}
						className="h-9 rounded-lg border border-navy/10 bg-white px-3 text-sm text-navy focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-bordeaux/30"
					>
						<option value="en">English</option>
						<option value="es">Espanol</option>
					</select>
				</div>
				<button
					onClick={submit}
					disabled={!email || status === 'loading'}
					className="h-9 px-4 rounded-lg bg-bordeaux text-cream text-sm font-medium transition-colors hover:bg-bordeaux-light disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{status === 'loading'
						? (lang === 'es' ? 'Enviando...' : 'Submitting...')
						: (lang === 'es' ? 'Suscribirse' : 'Subscribe')}
				</button>
			</div>
			{msg && (
				<p className={`text-xs mt-2 ${status === 'error' ? 'text-bordeaux' : 'text-green-600'}`}>
					{msg}
				</p>
			)}
			{!compact && (
				<p className="text-xs text-navy/30 mt-1.5">
					{lang === 'es'
						? 'Solo enviamos emails cuando se publica un nuevo blog. Cancela cuando quieras.'
						: 'We only email when a new blog is published. Unsubscribe anytime.'}
				</p>
			)}
		</div>
	)
}
