'use client'

import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { AboutContent } from '@/models/Section'
import LoadingSpinner from '@/components/ui/loading-spinner'

export default function About() {
  const [content, setContent] = useState<AboutContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('/api/sections/about')
        if (!response.ok) {
          throw new Error('Failed to fetch about information')
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
  if (!content) return null

  return (
    <div className="w-full pt-52 pb-24 md:py-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: -50 }}
          animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.5 }}
          className="relative w-[200px] md:w-[300px] h-[200px] md:h-[300px] mx-auto mt-16 md:mt-0"
        >
          <Image
            src="/pfp.jpg"
            alt="Iñaki Lozano's profile picture"
            fill
            sizes="(max-width: 768px) 200px, 300px"
            priority
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMzAwJyBoZWlnaHQ9JzMwMCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48cmVjdCBmaWxsPSIjZWVlIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+"
            className="rounded-full object-cover"
          />
        </motion.div>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: 50 }}
          animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.5, delay: 0.2 }}
          className="text-center md:text-left"
        >
          <h2 className="text-3xl font-bold mb-4 text-primary">About Me</h2>
          <p className="text-gray-600 mb-4 text-justify leading-relaxed">
            {content.description}
          </p>
          <h3 className="text-xl font-semibold mb-2 text-primary">Hobbies & Interests</h3>
          <ul
            className="list-disc list-inside text-gray-600 mb-6 space-y-1"
            aria-label="Hobbies and interests"
          >
            {content.highlights.map((highlight: string, index: number) => (
              <li key={index} className="text-left">{highlight}</li>
            ))}
          </ul>
          <a
            href="/CV.pdf"
            download
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-accent transition-colors duration-200"
            aria-label="Download CV (PDF)"
          >
            <span>Download CV</span>
          </a>
          <a
            href="/CV.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 ml-3 px-6 py-3 rounded-full font-semibold border border-primary text-primary hover:bg-primary/10 transition-colors duration-200"
          >
            View CV
          </a>
        </motion.div>
      </div>
    </div>
  )
}

