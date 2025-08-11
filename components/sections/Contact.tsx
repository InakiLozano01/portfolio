'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { FaEnvelope, FaGithub, FaLinkedin, FaMapMarkerAlt } from 'react-icons/fa'
import type { ContactContent } from '@/models/Section'
import LoadingSpinner from '@/components/ui/loading-spinner'

export default function ContactSection() {
  const [content, setContent] = useState<ContactContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [counters, setCounters] = useState({ name: 0, email: 0, message: 0 })
  const statusRef = useRef<HTMLParagraphElement | null>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('/api/sections/contact')
        if (!response.ok) {
          throw new Error('Failed to fetch contact information')
        }
        const data = await response.json()
        setContent(data.content)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [])

  const validateForm = () => {
    const errors: { [key: string]: string } = {}
    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    if (!formData.message.trim()) {
      errors.message = 'Message is required'
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
          body: JSON.stringify(formData)
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
      // Move focus to status message for screen readers
      queueMicrotask(() => statusRef.current?.focus())
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    // Update counters
    setCounters(prev => ({ ...prev, [name]: value.length }))
  }

  if (loading) return <LoadingSpinner />
  if (error) return <div role="alert" className="text-center text-red-500">{error}</div>
  if (!content) return null

  return (
    <div className="w-full pt-14 md:pt-0">
      <h2 className="text-3xl font-bold mb-8 text-primary">Get in Touch</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div
          className="bg-gray-50 rounded-lg p-6 shadow-sm"
          initial={reduceMotion ? false : { opacity: 0, x: -50 }}
          animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.5 }}
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4">Contact Information</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <FaEnvelope className="text-[#FD4345] w-5 h-5 mr-3" aria-hidden="true" />
              <a
                href={`mailto:${content.email}`}
                className="text-gray-600 hover:text-[#FD4345]"
                aria-label="Send email"
              >
                {content.email}
              </a>
            </div>
            <div className="flex items-center">
              <FaMapMarkerAlt className="text-[#FD4345] w-5 h-5 mr-3" aria-hidden="true" />
              <span className="text-gray-600">{content.city}</span>
            </div>
            <div className="flex items-center">
              <FaGithub className="text-[#FD4345] w-5 h-5 mr-3" aria-hidden="true" />
              <a
                href={content.social.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-[#FD4345]"
                aria-label="Visit GitHub profile"
              >
                GitHub
              </a>
            </div>
            <div className="flex items-center">
              <FaLinkedin className="text-[#FD4345] w-5 h-5 mr-3" aria-hidden="true" />
              <a
                href={content.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-[#FD4345]"
                aria-label="Visit LinkedIn profile"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-gray-50 rounded-lg p-6 shadow-sm"
          initial={reduceMotion ? false : { opacity: 0, x: 50 }}
          animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4">Send a Message</h3>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
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
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#FD4345] focus:border-transparent bg-white text-gray-900 ${formErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
              />
              <div className="mt-1 text-xs text-gray-500" aria-hidden="true">{counters.name}/80</div>
              {formErrors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-500" role="alert">
                  {formErrors.name}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
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
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#FD4345] focus:border-transparent bg-white text-gray-900 ${formErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
              />
              <div className="mt-1 text-xs text-gray-500" aria-hidden="true">{counters.email}/120</div>
              {formErrors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-500" role="alert">
                  {formErrors.email}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message <span className="text-red-500">*</span>
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
                rows={4}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#FD4345] focus:border-transparent bg-white text-gray-900 ${formErrors.message ? 'border-red-500' : 'border-gray-300'
                  }`}
              />
              <div className="mt-1 text-xs text-gray-500" aria-hidden="true">{counters.message}/1000</div>
              {formErrors.message && (
                <p id="message-error" className="mt-1 text-sm text-red-500" role="alert">
                  {formErrors.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-disabled={isSubmitting}
              className="w-full bg-[#FD4345] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#E13D3F] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
            <p
              ref={statusRef}
              tabIndex={-1}
              className={`text-center ${submitStatus === 'success' ? 'text-green-500' : submitStatus === 'error' ? 'text-red-500' : 'sr-only'}`}
              role={submitStatus === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              {submitStatus === 'success' ? 'Message sent successfully!' : submitStatus === 'error' ? 'Failed to send message. Please try again.' : ''}
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

