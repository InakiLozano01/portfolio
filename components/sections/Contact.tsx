'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaEnvelope, FaGithub, FaLinkedin, FaMapMarkerAlt } from 'react-icons/fa'
import type { ContactContent } from '@/models/Section'

export default function ContactSection() {
  const [content, setContent] = useState<ContactContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('/api/sections/contact')
        if (!response.ok) {
          throw new Error('Failed to fetch contact content')
        }
        const data = await response.json()
        if (!data || !data.content) {
          throw new Error('Invalid section data')
        }
        setContent(data.content)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch content')
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setStatus({
        type: 'success',
        message: 'Message sent successfully! I will get back to you soon.',
      });
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to send message',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (loading) return <div className="text-center">Loading...</div>
  if (error) return <div className="text-center text-red-500">{error}</div>
  if (!content) return null

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-8 text-primary">Get in Touch</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div
          className="bg-gray-50 rounded-lg p-6 shadow-sm"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4">Contact Information</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <FaEnvelope className="text-[#FD4345] w-5 h-5 mr-3" />
              <a href={`mailto:${content.email}`} className="text-gray-600 hover:text-[#FD4345]">
                {content.email}
              </a>
            </div>
            <div className="flex items-center">
              <FaMapMarkerAlt className="text-[#FD4345] w-5 h-5 mr-3" />
              <span className="text-gray-600">{content.city}</span>
            </div>
            <div className="flex items-center">
              <FaGithub className="text-[#FD4345] w-5 h-5 mr-3" />
              <a
                href={content.social.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-[#FD4345]"
              >
                GitHub
              </a>
            </div>
            <div className="flex items-center">
              <FaLinkedin className="text-[#FD4345] w-5 h-5 mr-3" />
              <a
                href={content.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-[#FD4345]"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-gray-50 rounded-lg p-6 shadow-sm"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4">Send a Message</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FD4345] focus:border-transparent bg-white text-gray-900"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FD4345] focus:border-transparent bg-white text-gray-900"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FD4345] focus:border-transparent bg-white text-gray-900"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-[#FD4345] text-white py-2 px-4 rounded-md font-medium hover:bg-[#ff5456] transition-colors ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
            {status.type && (
              <div
                className={`mt-4 p-4 rounded-md ${
                  status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}
              >
                {status.message}
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  )
}

