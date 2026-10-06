'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Check, Github, Linkedin, Mail, MapPin } from 'lucide-react'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'
import { EASE_OUT, pick, type Lang } from './content'

interface ContactSectionProps {
    lang?: Lang
    initialContent?: Record<string, any> | null
    dictionary?: any
}

const LIMITS = { name: 80, email: 120, message: 1000 } as const
type Field = keyof typeof LIMITS

export default function ContactSection({ lang = 'en', initialContent = null, dictionary = {} }: ContactSectionProps) {
    const reduce = useReducedMotion()
    const t = dictionary?.contact || {}
    const [form, setForm] = useState({ name: '', email: '', message: '' })
    const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
    const statusRef = useRef<HTMLParagraphElement | null>(null)

    const content = initialContent || {}
    const email: string = content.email || ''
    const city: string = pick(lang, content, 'city') || ''
    const social = content.social || {}

    const validate = () => {
        const next: Partial<Record<Field, string>> = {}
        if (!form.name.trim()) next.name = t.nameRequired || 'Name is required'
        if (!form.email.trim()) next.email = t.emailRequired || 'Email is required'
        else if (!/\S+@\S+\.\S+/.test(form.email)) next.email = t.emailInvalid || 'Please enter a valid email address'
        if (!form.message.trim()) next.message = t.messageRequired || 'Message is required'
        return next
    }

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        const next = validate()
        setErrors(next)
        if (Object.keys(next).length) {
            const first = (Object.keys(next) as Field[])[0]
            document.getElementById(`contact-${first}`)?.focus()
            return
        }
        setStatus('sending')
        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            if (response.ok) {
                setStatus('success')
                setForm({ name: '', email: '', message: '' })
            } else {
                setStatus('error')
            }
        } catch {
            setStatus('error')
        }
        queueMicrotask(() => statusRef.current?.focus())
    }

    const onChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const name = event.target.name as Field
        setForm((prev) => ({ ...prev, [name]: event.target.value.slice(0, LIMITS[name]) }))
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
        if (status !== 'idle' && status !== 'sending') setStatus('idle')
    }

    const fieldClass = (name: Field) =>
        `w-full rounded-2xl border bg-surface px-5 text-[15px] text-fg placeholder:text-fg-dim transition-[border-color,box-shadow] focus:outline-none ${errors[name] ? 'border-signal' : 'border-line/15 focus:border-signal/70'}`

    const renderField = (name: Field, label: string, type: 'text' | 'email' | 'textarea', autoComplete?: string) => (
        <div>
            <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor={`contact-${name}`} className="text-sm text-fg-soft">
                    {label} <span className="text-signal-text" aria-hidden="true">*</span>
                </label>
                <span className="font-mono text-[11px] text-fg-dim" aria-hidden="true">{form[name].length}/{LIMITS[name]}</span>
            </div>
            {type === 'textarea' ? (
                <textarea
                    id={`contact-${name}`}
                    name={name}
                    rows={6}
                    required
                    value={form[name]}
                    onChange={onChange}
                    maxLength={LIMITS[name]}
                    aria-invalid={!!errors[name]}
                    aria-describedby={errors[name] ? `contact-${name}-error` : undefined}
                    className={`${fieldClass(name)} resize-y py-4`}
                />
            ) : (
                <input
                    id={`contact-${name}`}
                    name={name}
                    type={type}
                    required
                    autoComplete={autoComplete}
                    value={form[name]}
                    onChange={onChange}
                    maxLength={LIMITS[name]}
                    aria-invalid={!!errors[name]}
                    aria-describedby={errors[name] ? `contact-${name}-error` : undefined}
                    className={`${fieldClass(name)} h-12`}
                />
            )}
            {errors[name] && (
                <p id={`contact-${name}-error`} role="alert" className="mt-2 text-sm text-signal-text">
                    {errors[name]}
                </p>
            )}
        </div>
    )

    return (
        <div className="relative">
            <div className="grid gap-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-24">
                <div>
                    <SectionHeading title={t.title || 'Get in Touch'} />
                    {email && (
                        <Reveal className="mt-12">
                            <p className="text-sm text-fg-dim">{t.orWrite || 'Or write directly'}</p>
                            <a
                                href={`mailto:${email}`}
                                aria-label={t.sendEmailAria || 'Send email'}
                                className="group mt-3 inline-flex max-w-full items-center gap-3 break-all text-[clamp(1.25rem,2.6vw,2rem)] font-medium tracking-[-0.02em] text-fg"
                            >
                                <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 group-hover:bg-[length:100%_1px]">
                                    {email}
                                </span>
                                <ArrowUpRight size={22} strokeWidth={1.5} className="shrink-0 text-signal transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
                            </a>
                        </Reveal>
                    )}
                    <Reveal className="mt-12 flex flex-wrap items-center gap-3">
                        {social.github && (
                            <a href={social.github} target="_blank" rel="noopener noreferrer" aria-label={t.githubAria || 'Visit GitHub profile'} className="inline-flex h-12 items-center gap-2 rounded-full border border-line/15 px-5 text-sm text-fg transition-colors hover:border-signal/70 hover:bg-signal/[0.06]">
                                <Github size={16} strokeWidth={1.75} /> GitHub
                            </a>
                        )}
                        {social.linkedin && (
                            <a href={social.linkedin} target="_blank" rel="noopener noreferrer" aria-label={t.linkedinAria || 'Visit LinkedIn profile'} className="inline-flex h-12 items-center gap-2 rounded-full border border-line/15 px-5 text-sm text-fg transition-colors hover:border-signal/70 hover:bg-signal/[0.06]">
                                <Linkedin size={16} strokeWidth={1.75} /> LinkedIn
                            </a>
                        )}
                        {city && (
                            <span className="inline-flex h-12 items-center gap-2 px-2 text-sm text-fg-dim">
                                <MapPin size={16} strokeWidth={1.75} aria-hidden="true" /> {city}
                            </span>
                        )}
                    </Reveal>
                </div>

                <Reveal className="field-cream rounded-3xl p-6 sm:p-10">
                    <h3 className="text-xl font-medium tracking-[-0.02em] text-fg">{t.sendMessage || 'Send a Message'}</h3>
                    <form onSubmit={submit} noValidate className="mt-8 grid gap-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                            {renderField('name', t.name || 'Name', 'text', 'name')}
                            {renderField('email', t.email || 'Email', 'email', 'email')}
                        </div>
                        {renderField('message', t.message || 'Message', 'textarea')}
                        <div className="flex flex-wrap items-center gap-5">
                            <motion.button
                                type="submit"
                                disabled={status === 'sending'}
                                whileTap={reduce ? undefined : { scale: 0.97 }}
                                className="group inline-flex h-12 items-center gap-2 rounded-full bg-action px-7 text-[15px] font-medium text-action-fg transition-colors duration-300 hover:bg-navy disabled:cursor-wait disabled:opacity-70"
                            >
                                <Mail size={16} strokeWidth={1.75} />
                                {status === 'sending' ? t.sending || 'Sending...' : t.send || 'Send Message'}
                            </motion.button>
                            <AnimatePresence mode="wait">
                                {(status === 'success' || status === 'error') && (
                                    <motion.p
                                        key={status}
                                        ref={statusRef}
                                        tabIndex={-1}
                                        role="status"
                                        initial={reduce ? false : { opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.4, ease: EASE_OUT }}
                                        className={`inline-flex items-center gap-2 text-sm ${status === 'success' ? 'text-fg' : 'text-signal-text'}`}
                                    >
                                        {status === 'success' && (
                                            <span className="grid h-6 w-6 place-items-center rounded-full bg-signal/15 text-signal">
                                                <Check size={14} strokeWidth={2} />
                                            </span>
                                        )}
                                        {status === 'success' ? t.success || 'Message sent successfully!' : t.errorMsg || 'Failed to send message. Please try again.'}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>
                    </form>
                </Reveal>
            </div>
        </div>
    )
}
