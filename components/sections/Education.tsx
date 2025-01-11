'use client'

import { motion } from 'framer-motion'
import { FaGraduationCap } from 'react-icons/fa'
import { useEffect, useState } from 'react'
import type { EducationContent } from '@/models/Section'

export default function EducationSection() {
  const [content, setContent] = useState<EducationContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('/api/sections/education')
        if (!response.ok) {
          throw new Error('Failed to fetch education content')
        }
        const data = await response.json()
        if (!data || !data.content) {
          throw new Error('Invalid section data')
        }
        setContent(data.content)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch content')
        console.error('Error fetching education content:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [])

  if (loading) return <div className="text-center">Loading...</div>
  if (error) return <div className="text-center text-red-500">{error}</div>
  if (!content || !content.education.length) return null

  return (
    <section className="flex items-center justify-center bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8 text-primary">Education</h2>
        <div className="relative pl-6">
          <div className="absolute left-0 top-0 h-full w-0.5 bg-[#FD4345]/20"></div>
          {content.education.map((item, index) => (
            <motion.div
              key={index}
              className="mb-8 relative"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              <div className="absolute left-0 top-4 -translate-x-[13px] z-20 flex items-center justify-center bg-[#FD4345] shadow-xl w-5 h-5 rounded-full">
                <FaGraduationCap className="text-white text-xs" />
              </div>
              <div className="ml-6 bg-gray-50 rounded-lg p-6 shadow-sm">
                <h3 className="mb-2 font-bold text-[#FD4345] text-xl">{item.degree}</h3>
                <p className="text-gray-800 mb-1">{item.institution}</p>
                <p className="text-gray-600 mb-1">{item.period}</p>
                <p className="text-gray-600">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

