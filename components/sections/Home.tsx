'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { HomeContent } from '@/models/Section'

export default function HomePage() {
  const [content, setContent] = useState<HomeContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('/api/sections/home')
        if (!response.ok) {
          throw new Error('Failed to fetch home content')
        }
        
        const data = await response.json()
        if (!data || !data.content) {
          throw new Error('Invalid section data')
        }
        
        setContent(data.content)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch content')
        console.error('Error fetching home content:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [])

  if (loading) return <div className="text-center">Loading...</div>
  if (error) return <div className="text-center text-red-500">{error}</div>
  if (!content) return null

  return (
    <section id="home" className="flex items-start justify-center min-h-screen bg-white relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F5F5F5" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      <div className="container mx-auto px-4 text-center relative z-10 mt-36">
        <motion.h1
          className="text-4xl md:text-6xl font-bold mb-4 text-primary"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {content.headline}
        </motion.h1>
        <motion.p
          className="text-xl mb-8 text-gray-600"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {content.description}
        </motion.p>
      </div>
    </section>
  )
}

