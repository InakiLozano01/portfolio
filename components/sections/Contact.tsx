'use client'

import { useState, useEffect, useRef } from 'react'
import { FaEnvelope, FaGithub, FaLinkedin, FaMapMarkerAlt } from 'react-icons/fa'
import type { ContactContent } from '@/models/Section'
import LoadingSpinner from '@/components/ui/loading-spinner'
import ScrollReveal from '@/components/scroll-reveal'

interface ContactSectionProps {
	lang?: 'en' | 'es'
}

export default function ContactSection({ lang = 'en' }: ContactSectionProps) {
	const [content, setContent] = useState<ContactContent>({
		email: 'inakilozano01@gmail.com',
		city: 'San Miguel de Tucuman, Argentina',
		city_en: 'San Miguel de Tucuman, Argentina',
		city_es: 'San Miguel de Tucuman, Argentina',
		social: {
			github: 'https://github.com/InakiLozano01',
			linkedin: 'https://www.linkedin.com/in/inaki-lozano',
		},
	})
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		message: '',
	})
	const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
	const [counters, setCounters] = useState({ name: 0, email: 0, message: 0 })
	const statusRef = useRef<HTMLParagraphElement | null>(null)

	const labels = {
		title: lang === 'en' ? 'Get in touch' : 'Ponte en contacto',
		contactInfo: lang === 'en' ? 'Contact information' : 'Informacion de contacto',
		sendMessage: lang === 'en' ? 'Send a message' : 'Enviar mensaje',
		name: lang === 'en' ? 'Name' : 'Nombre',
		email: 'Email',
		message: lang === 'en' ? 'Message' : 'Mensaje',
		send: lang === 'en' ? 'Send message' : 'Enviar mensaje',
		sending: lang === 'en' ? 'Sending...' : 'Enviando...',
		success: lang === 'en' ? 'Message sent successfully.' : 'Mensaje enviado correctamente.',
		errorMsg: lang === 'en' ? 'Failed to send message. Please try again.' : 'No se pudo enviar el mensaje. Intentalo de nuevo.',
		nameRequired: lang === 'en' ? 'Name is required' : 'El nombre es obligatorio',
		emailRequired: lang === 'en' ? 'Email is required' : 'El email es obligatorio',
		emailInvalid: lang === 'en' ? 'Please enter a valid email address' : 'Por favor, ingresa un email valido',
		messageRequired: lang === 'en' ? 'Message is required' : 'El mensaje es obligatorio',
	}

	useEffect(() => {
		const fetchContent = async () => {
			try {
				const response = await fetch('/api/sections/contact')
				if (!response.ok) {
					throw new Error('Failed to fetch contact information')
				}
				const data = await response.json()
				if (data.content) {
					setContent(data.content)
				}
			} catch (err) {
				console.error('Error fetching contact data:', err)
			}
		}

		fetchContent()
	}, [])

	const validateForm = () => {
		const errors: { [key: string]: string } = {}
		if (!formData.name.trim()) {
			errors.name = labels.nameRequired
		}
		if (!formData.email.trim()) {
			errors.email = labels.emailRequired
		} else if (!/\S+@\S+\.\S+/.test(formData.email)) {
			errors.email = labels.emailInvalid
		}
		if (!formData.message.trim()) {
			errors.message = labels.messageRequired
		}
		return errors
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		const errors = validateForm()
		setFormErrors(errors)

		if (Object.keys(errors).length === 0) {
			setIsSubmitting(true)
			setSubmitStatus('idle')
			try {
				const response = await fetch('/api/contact', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(formData),
				})
				if (response.ok) {
					setSubmitStatus('success')
					setFormData({ name: '', email: '', message: '' })
					setCounters({ name: 0, email: 0, message: 0 })
				} else {
					setSubmitStatus('error')
				}
			} catch (err) {
				setSubmitStatus('error')
			}
			setIsSubmitting(false)
			queueMicrotask(() => statusRef.current?.focus())
		}
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value } = e.target
		setFormData(prev => ({
			...prev,
			[name]: value,
		}))
		if (formErrors[name]) {
			setFormErrors(prev => ({
				...prev,
				[name]: '',
			}))
		}
		setCounters(prev => ({ ...prev, [name]: value.length }))
	}

	const city = (lang === 'en' ? content.city_en : content.city_es) || content.city

	return (
		<div className="w-full">
			<ScrollReveal>
				<h2 className="text-3xl md:text-4xl font-bold mb-12 text-cream tracking-display">
					{labels.title}
				</h2>
			</ScrollReveal>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
				<ScrollReveal delay={0.1}>
					<div>
						<h3 className="text-lg font-semibold text-cream mb-6">{labels.contactInfo}</h3>
						<div className="space-y-5">
							<div className="flex items-center gap-4">
								<div className="w-10 h-10 rounded-lg bg-cream/10 flex items-center justify-center flex-shrink-0">
									<FaEnvelope className="w-4 h-4 text-bordeaux-light" aria-hidden="true" />
								</div>
								<a
									href={`mailto:${content.email}`}
									className="text-cream/70 hover:text-cream transition-colors text-sm"
									aria-label="Send email"
								>
									{content.email}
								</a>
							</div>
							<div className="flex items-center gap-4">
								<div className="w-10 h-10 rounded-lg bg-cream/10 flex items-center justify-center flex-shrink-0">
									<FaMapMarkerAlt className="w-4 h-4 text-bordeaux-light" aria-hidden="true" />
								</div>
								<span className="text-cream/70 text-sm">{city}</span>
							</div>
							<div className="flex items-center gap-4">
								<div className="w-10 h-10 rounded-lg bg-cream/10 flex items-center justify-center flex-shrink-0">
									<FaGithub className="w-4 h-4 text-bordeaux-light" aria-hidden="true" />
								</div>
								<a
									href={content.social.github}
									target="_blank"
									rel="noopener noreferrer"
									className="text-cream/70 hover:text-cream transition-colors text-sm"
									aria-label="Visit GitHub profile"
								>
									GitHub
								</a>
							</div>
							<div className="flex items-center gap-4">
								<div className="w-10 h-10 rounded-lg bg-cream/10 flex items-center justify-center flex-shrink-0">
									<FaLinkedin className="w-4 h-4 text-bordeaux-light" aria-hidden="true" />
								</div>
								<a
									href={content.social.linkedin}
									target="_blank"
									rel="noopener noreferrer"
									className="text-cream/70 hover:text-cream transition-colors text-sm"
									aria-label="Visit LinkedIn profile"
								>
									LinkedIn
								</a>
							</div>
						</div>
					</div>
				</ScrollReveal>

				<ScrollReveal delay={0.2}>
					<div className="bg-cream/5 border border-cream/8 rounded-xl p-6 md:p-8">
						<h3 className="text-lg font-semibold text-cream mb-6">{labels.sendMessage}</h3>
						<form onSubmit={handleSubmit} className="space-y-5" noValidate>
							<div>
								<label htmlFor="name" className="block text-sm font-medium text-cream/60 mb-1.5">
									{labels.name} <span className="text-bordeaux-light">*</span>
								</label>
								<input
									type="text"
									id="name"
									name="name"
									value={formData.name}
									onChange={handleChange}
									maxLength={80}
									required
									aria-required="true"
									aria-invalid={!!formErrors.name}
									aria-describedby={formErrors.name ? 'name-error' : undefined}
									className={`w-full px-4 py-2.5 rounded-lg bg-cream/5 border text-cream text-sm placeholder:text-cream/20 focus:outline-none focus:ring-1 focus:ring-bordeaux/50 transition-colors ${
										formErrors.name ? 'border-bordeaux-light' : 'border-cream/10'
									}`}
								/>
								<div className="flex justify-between mt-1">
									{formErrors.name ? (
										<p id="name-error" className="text-xs text-bordeaux-light" role="alert">
											{formErrors.name}
										</p>
									) : <span />}
									<span className="text-xs text-cream/20" aria-hidden="true">{counters.name}/80</span>
								</div>
							</div>

							<div>
								<label htmlFor="email" className="block text-sm font-medium text-cream/60 mb-1.5">
									{labels.email} <span className="text-bordeaux-light">*</span>
								</label>
								<input
									type="email"
									id="email"
									name="email"
									value={formData.email}
									onChange={handleChange}
									maxLength={120}
									required
									aria-required="true"
									aria-invalid={!!formErrors.email}
									aria-describedby={formErrors.email ? 'email-error' : undefined}
									className={`w-full px-4 py-2.5 rounded-lg bg-cream/5 border text-cream text-sm placeholder:text-cream/20 focus:outline-none focus:ring-1 focus:ring-bordeaux/50 transition-colors ${
										formErrors.email ? 'border-bordeaux-light' : 'border-cream/10'
									}`}
								/>
								<div className="flex justify-between mt-1">
									{formErrors.email ? (
										<p id="email-error" className="text-xs text-bordeaux-light" role="alert">
											{formErrors.email}
										</p>
									) : <span />}
									<span className="text-xs text-cream/20" aria-hidden="true">{counters.email}/120</span>
								</div>
							</div>

							<div>
								<label htmlFor="message" className="block text-sm font-medium text-cream/60 mb-1.5">
									{labels.message} <span className="text-bordeaux-light">*</span>
								</label>
								<textarea
									id="message"
									name="message"
									value={formData.message}
									onChange={handleChange}
									maxLength={1000}
									required
									aria-required="true"
									aria-invalid={!!formErrors.message}
									aria-describedby={formErrors.message ? 'message-error' : undefined}
									rows={5}
									className={`w-full px-4 py-2.5 rounded-lg bg-cream/5 border text-cream text-sm placeholder:text-cream/20 focus:outline-none focus:ring-1 focus:ring-bordeaux/50 transition-colors resize-none ${
										formErrors.message ? 'border-bordeaux-light' : 'border-cream/10'
									}`}
								/>
								<div className="flex justify-between mt-1">
									{formErrors.message ? (
										<p id="message-error" className="text-xs text-bordeaux-light" role="alert">
											{formErrors.message}
										</p>
									) : <span />}
									<span className="text-xs text-cream/20" aria-hidden="true">{counters.message}/1000</span>
								</div>
							</div>

							<button
								type="submit"
								disabled={isSubmitting}
								aria-disabled={isSubmitting}
								className="w-full bg-bordeaux hover:bg-bordeaux-light text-cream px-6 py-3 rounded-lg font-medium text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isSubmitting ? labels.sending : labels.send}
							</button>

							<p
								ref={statusRef}
								tabIndex={-1}
								className={`text-center text-sm ${
									submitStatus === 'success'
										? 'text-green-400'
										: submitStatus === 'error'
											? 'text-bordeaux-light'
											: 'sr-only'
								}`}
								role={submitStatus === 'error' ? 'alert' : 'status'}
								aria-live="polite"
							>
								{submitStatus === 'success' ? labels.success : submitStatus === 'error' ? labels.errorMsg : ''}
							</p>
						</form>
					</div>
				</ScrollReveal>
			</div>
		</div>
	)
}
