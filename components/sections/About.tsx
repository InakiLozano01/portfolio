'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { AboutContent } from '@/models/Section'

export default function About() {
  const [content, setContent] = useState<AboutContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('/api/sections/about')
        if (!response.ok) {
          throw new Error('Failed to fetch about content')
        }
        const data = await response.json()
        if (!data || !data.content) {
          throw new Error('Invalid section data')
        }
        setContent(data.content)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch content')
        console.error('Error fetching about content:', err)
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
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-[300px] h-[300px] mx-auto"
        >
          <Image
            src="/pfp.jpg"
            alt="Iñaki Lozano"
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            priority
            className="rounded-full object-cover"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold mb-4 text-primary">About Me</h2>
          <p className="text-gray-600 mb-4 whitespace-pre-line">
            {content.description}
          </p>
          <h3 className="text-xl font-semibold mb-2 text-primary">Hobbies & Interests</h3>
          <ul className="list-disc list-inside text-gray-600 mb-6">
            {content.highlights.map((highlight: string, index: number) => (
              <li key={index}>{highlight}</li>
            ))}
          </ul>
          <a
            href="/CV.pdf"
            download
            className="bg-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-accent transition-colors duration-200"
          >
            Download CV
          </a>
        </motion.div>
      </div>
    </div>
  )
}

