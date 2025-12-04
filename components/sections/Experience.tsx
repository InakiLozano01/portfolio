'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaBriefcase } from 'react-icons/fa'
import LoadingSpinner from '@/components/ui/loading-spinner'

interface Experience {
  title: string
  title_es?: string
  company: string
  period: string
  description?: string
  description_es?: string
  responsibilities: string[]
  responsibilities_es?: string[]
}

interface ExperienceContent {
  experiences: Experience[]
}

interface ExperienceProps {
  lang?: 'en' | 'es';
}

export default function Experience({ lang = 'en' }: ExperienceProps) {
  const [content, setContent] = useState<ExperienceContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('/api/sections/experience')
        if (!response.ok) {
          throw new Error('Failed to fetch experience information')
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
  if (!content?.experiences) return null

  const title = lang === 'en' ? 'Experience' : 'Experiencia'
  const keyResponsibilities = lang === 'en' ? 'Key Responsibilities:' : 'Responsabilidades clave:'

  return (
    <div className="w-full">
      <div className="pt-16 pb-24 md:py-0">
        <h2 className="text-3xl font-bold mb-6 text-primary">{title}</h2>
        <div className="space-y-8">
          {content.experiences.map((exp, index) => {
            const jobTitle = (lang === 'en' ? exp.title : exp.title_es) || exp.title
            const description = (lang === 'en' ? exp.description : exp.description_es) || exp.description
            const responsibilities = (lang === 'en' ? exp.responsibilities : exp.responsibilities_es) || exp.responsibilities

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="mt-1 p-2 bg-primary/10 rounded-lg flex-shrink-0"
                    aria-hidden="true"
                  >
                    <FaBriefcase className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:justify-between mb-3">
                      <h3 className="text-xl font-semibold text-gray-900 break-words md:truncate pr-4">
                        {jobTitle}
                      </h3>
                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        {exp.period}
                      </span>
                    </div>
                    <p className="text-lg text-gray-700 mb-3">{exp.company}</p>
                    {description && (
                      <div className="mt-4">
                        <p className="text-gray-600">{description}</p>
                      </div>
                    )}
                    {responsibilities && responsibilities.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">{keyResponsibilities}</h4>
                        <ul className="space-y-2 text-gray-600" role="list">
                          {responsibilities.map((responsibility: string, i: number) => (
                            <li
                              key={i}
                              className="flex items-start gap-2"
                            >
                              <span
                                className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0"
                                aria-hidden="true"
                              />
                              <span>{responsibility}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}


