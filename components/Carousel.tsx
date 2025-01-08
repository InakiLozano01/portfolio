'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

export default function Carousel({ 
  children,
  currentIndex: externalIndex
}: { 
  children: React.ReactNode;
  currentIndex: number;
}) {
  const [internalIndex, setInternalIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [windowWidth, setWindowWidth] = useState(0)

  // Sync internal state with external index
  useEffect(() => {
    setInternalIndex(externalIndex)
  }, [externalIndex])

  useEffect(() => {
    setWindowWidth(window.innerWidth)
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle manual swipe detection
  const handleScroll = () => {
    if (containerRef.current) {
      const scrollLeft = containerRef.current.scrollLeft
      const newIndex = Math.round(scrollLeft / windowWidth)
      if (newIndex !== internalIndex) {
        setInternalIndex(newIndex)
        // Update hash on swipe
        const sections = ['home', 'about', 'education', 'experience', 'skills', 'blog', 'contact']
        if (sections[newIndex]) {
          window.location.hash = `#${sections[newIndex]}`
          // Dispatch hashchange event to update header
          window.dispatchEvent(new HashChangeEvent('hashchange'))
        }
      }
    }
  }

  useEffect(() => {
    if (containerRef.current && windowWidth) {
      containerRef.current.scrollTo({
        left: internalIndex * windowWidth,
        behavior: 'smooth',
      })
    }
  }, [internalIndex, windowWidth])

  return (
    <div
      ref={containerRef}
      className="flex overflow-x-scroll snap-x snap-mandatory scrollbar-hide h-full touch-pan-x"
      style={{ scrollSnapType: 'x mandatory' }}
      onScroll={handleScroll}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          className="flex-shrink-0 w-full h-full snap-start overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}

