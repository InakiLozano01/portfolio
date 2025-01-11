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
    <footer className="bg-[#1a2433] text-white py-2">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href={contactData.social.linkedin} target="_blank" className="hover:text-[#FD4345] transition-colors">
            <FaLinkedin size={20} />
          </Link>
          <Link href={contactData.social.github} target="_blank" className="hover:text-[#FD4345] transition-colors">
            <FaGithub size={20} />
          </Link>
          <Link href={`mailto:${contactData.email}`} className="hover:text-[#FD4345] transition-colors">
            <FaEnvelope size={20} />
          </Link>
        </div>
        <p className="text-sm text-gray-400">© {currentYear} Iñaki Fernando Lozano</p>
      </div>
    </footer>
  )
}

