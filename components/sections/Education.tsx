'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaGraduationCap } from 'react-icons/fa'
import LoadingSpinner from '@/components/ui/loading-spinner'

interface Education {
  institution: string
  degree: string
  period: string
  description: string
}

interface EducationContent {
  education: Education[]
}

export default function Education() {
  const [content, setContent] = useState<EducationContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('/api/sections/education')
        if (!response.ok) {
          throw new Error('Failed to fetch education information')
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

  if (loading) return <LoadingSpinner />
  if (error) return <div role="alert" className="text-center text-red-500">{error}</div>
  if (!content?.education) return null

  return (
    <div className="w-full py-32 md:py-0">
      <h2 className="text-3xl font-bold mb-8 text-primary">Education</h2>
      <div className="space-y-8">
        {content.education.map((edu, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div 
                className="mt-1 p-2 bg-primary/10 rounded-lg"
                aria-hidden="true"
              >
                <FaGraduationCap className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {edu.degree}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {edu.period}
                  </span>
                </div>
                <p className="text-lg text-gray-700 mb-2">{edu.institution}</p>
                {edu.description && (
                  <div className="mt-4">
                    <p className="text-gray-600">{edu.description}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

