'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { HomeContent } from '@/models/Section'
import TextWithEmoji from '@/components/ui/TextWithEmoji'

export default function HomePage() {
  const [content, setContent] = useState<HomeContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reduceMotion = useReducedMotion()

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

  if (loading) return <div className="text-center" role="status" aria-live="polite">Loading…</div>
  if (error) return <div className="text-center text-red-500">{error}</div>
  if (!content) return null

  return (
    <div className="w-full flex flex-col items-center justify-center py-10 md:py-0">
      <div className="container mx-auto px-4 text-center max-w-3xl">
        <motion.h1
          className="text-4xl md:text-6xl font-bold mb-6 text-primary"
          initial={reduceMotion ? false : { opacity: 0, y: -50 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.5 }}
        >
          <TextWithEmoji text={content.headline} />
        </motion.h1>
        <motion.p
          className="text-xl mb-8 text-gray-600 leading-relaxed"
          initial={reduceMotion ? false : { opacity: 0, y: 50 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.5, delay: 0.2 }}
        >
          <TextWithEmoji text={content.description} />
        </motion.p>
      </div>
    </div>
  )
}

