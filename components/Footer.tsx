'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FaLinkedin, FaGithub, FaEnvelope } from 'react-icons/fa'
import type { ContactContent } from '@/models/Section'

export default function Footer() {
  const [contactData, setContactData] = useState<ContactContent | null>(null)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    const fetchContactData = async () => {
      try {
        const response = await fetch('/api/sections/contact')
        if (!response.ok) throw new Error('Failed to fetch contact data')
        const data = await response.json()
        setContactData(data.content)
      } catch (error) {
        console.error('Error fetching contact data:', error)
      }
    }

    fetchContactData()
  }, [])

  if (!contactData) return null

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-[40px] bg-[#1a2433] text-white z-50 md:relative md:flex-shrink-0">
      <div className="container h-full mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {contactData.social.linkedin && (
            <Link href={contactData.social.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-[#FD4345] transition-colors" aria-label="LinkedIn">
              <span className="pointer-events-none">
                <FaLinkedin size={20} />
              </span>
            </Link>
          )}
          {contactData.social.github && (
            <Link href={contactData.social.github} target="_blank" rel="noopener noreferrer" className="hover:text-[#FD4345] transition-colors" aria-label="GitHub">
              <span className="pointer-events-none">
                <FaGithub size={20} />
              </span>
            </Link>
          )}
          {contactData.email && (
            <Link href={`mailto:${contactData.email}`} className="hover:text-[#FD4345] transition-colors" aria-label="Email">
              <span className="pointer-events-none">
                <FaEnvelope size={20} />
              </span>
            </Link>
          )}
        </div>
        <p className="text-sm text-gray-400">© {currentYear} Iñaki Fernando Lozano</p>
      </div>
    </footer>
  )
}

