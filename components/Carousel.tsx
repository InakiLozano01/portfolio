'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
  const childrenArray = React.Children.toArray(children)

  // Sync internal state with external index
  useEffect(() => {
    setInternalIndex(externalIndex)
  }, [externalIndex])

  useEffect(() => {
    setWindowWidth(window.innerWidth)
    
    const handleResize = () => {
      const width = window.innerWidth
      setWindowWidth(width)
      if (containerRef.current) {
        containerRef.current.scrollTo({
          left: internalIndex * width,
          behavior: 'auto'
        })
      }
    }

    const debouncedResize = debounce(handleResize, 100)
    window.addEventListener('resize', debouncedResize)
    return () => window.removeEventListener('resize', debouncedResize)
  }, [internalIndex])

  useEffect(() => {
    if (containerRef.current && windowWidth) {
      containerRef.current.scrollTo({
        left: internalIndex * windowWidth,
        behavior: 'smooth'
      })
    }
  }, [internalIndex, windowWidth])

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? windowWidth : -windowWidth,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? windowWidth : -windowWidth,
      opacity: 0
    })
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence initial={false} mode="wait" custom={internalIndex}>
        <motion.div
          key={internalIndex}
          custom={internalIndex}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          className="absolute w-full h-full"
        >
          {childrenArray[internalIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

