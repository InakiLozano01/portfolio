'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaBriefcase } from 'react-icons/fa'
import type { ExperienceContent } from '@/models/Section'

export default function ExperienceSection() {
  const [content, setContent] = useState<ExperienceContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('/api/sections/experience')
        if (!response.ok) {
          throw new Error('Failed to fetch experience content')
        }
        const data = await response.json()
        if (!data || !data.content) {
          throw new Error('Invalid section data')
        }
        setContent(data.content)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch content')
        console.error('Error fetching experience content:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [])

  if (loading) return <div className="text-center">Loading...</div>
  if (error) return <div className="text-center text-red-500">{error}</div>
  if (!content || !content.experiences.length) return null

  return (
    <section className="flex items-center justify-center bg-white">
      <div className="container mx-auto px-4 pt-36 md:pt-16">
        <h2 className="text-3xl font-bold mb-8 text-primary">Experience</h2>
        <div className="relative pl-6">
          <div className="absolute left-0 top-0 h-full w-0.5 bg-[#FD4345]/20"></div>
          {content.experiences.map((job, index) => (
            <motion.div
              key={index}
              className="mb-8 relative"
              initial={isClient ? { opacity: 0, x: -50 } : false}
              animate={isClient ? { opacity: 1, x: 0 } : false}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              <div className="absolute left-0 top-4 -translate-x-[13px] z-20 flex items-center justify-center bg-[#FD4345] shadow-xl w-5 h-5 rounded-full">
                <FaBriefcase className="text-white text-xs" />
              </div>
              <div className="ml-6 bg-gray-50 rounded-lg p-6 shadow-sm">
                <h3 className="mb-2 font-bold text-[#FD4345] text-xl">{job.title}</h3>
                <p className="text-gray-800 mb-1">{job.company}</p>
                <p className="text-gray-600 mb-2">{job.period}</p>
                {job.description && (
                  <p className="text-gray-600 mb-2">{job.description}</p>
                )}
                <ul className="space-y-2">
                  {job.responsibilities.map((responsibility, idx) => (
                    <li key={idx} className="text-gray-600 pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[0.6em] before:w-1.5 before:h-1.5 before:bg-[#FD4345]/50 before:rounded-full">
                      {responsibility}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

