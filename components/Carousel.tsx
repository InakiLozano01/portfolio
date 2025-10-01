'use client'

import React, { useState, useEffect, useCallback, TouchEvent, KeyboardEvent } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

interface CarouselProps {
  children: React.ReactNode
  currentIndex: number
  onSwipe?: (newIndex: number) => void
}

export default function Carousel({
  children,
  currentIndex: externalIndex,
  onSwipe,
}: CarouselProps) {
  const [internalIndex, setInternalIndex] = useState(externalIndex)
  const [direction, setDirection] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [windowWidth, setWindowWidth] = useState(0)
  const reduceMotion = useReducedMotion()

  const childrenArray = React.Children.toArray(children)

  useEffect(() => {
    const setWidth = () => setWindowWidth(window.innerWidth)
    setWidth()
    window.addEventListener('resize', setWidth)
    return () => window.removeEventListener('resize', setWidth)
  }, [])

  useEffect(() => {
    if (externalIndex !== internalIndex) {
      setDirection(externalIndex > internalIndex ? -1 : 1)
      setInternalIndex(externalIndex)
    }
  }, [externalIndex, internalIndex])

  const handleTouchStart = (e: TouchEvent) => {
    setTouchEnd(0) // Reset
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe || isRightSwipe) {
      const direction = isLeftSwipe ? 1 : -1
      const newIndex = internalIndex + direction

      if (newIndex >= 0 && newIndex < childrenArray.length) {
        setDirection(-direction)
        setInternalIndex(newIndex)
        onSwipe?.(newIndex)
      }
    }

    // Reset values
    setTouchStart(0)
    setTouchEnd(0)
  }, [touchStart, touchEnd, internalIndex, childrenArray.length, onSwipe])

  const variants = {
    enter: (dir: number) => ({
      x: dir < 0 ? windowWidth : -windowWidth,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      zIndex: 0,
      x: dir < 0 ? -windowWidth : windowWidth,
      opacity: 0,
    }),
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden touch-pan-y"
      role="region"
      aria-roledescription="carousel"
      aria-label="Sections"
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'ArrowLeft') {
          const prev = internalIndex - 1
          if (prev >= 0) {
            setDirection(1)
            setInternalIndex(prev)
            onSwipe?.(prev)
          }
        } else if (e.key === 'ArrowRight') {
          const next = internalIndex + 1
          if (next < childrenArray.length) {
            setDirection(-1)
            setInternalIndex(next)
            onSwipe?.(next)
          }
        }
      }}
      tabIndex={0}
      aria-live="polite"
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={internalIndex}
          custom={direction}
          variants={variants}
          initial={reduceMotion ? false : 'enter'}
          animate={reduceMotion ? undefined : 'center'}
          exit={reduceMotion ? undefined : 'exit'}
          transition={{
            x: reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 },
            opacity: reduceMotion ? { duration: 0 } : { duration: 0.2 },
          }}
          className="absolute inset-0 w-full h-full touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {childrenArray[internalIndex]}
        </motion.div>
      </AnimatePresence>
      <div className="absolute left-0 right-0 bottom-4 md:bottom-6 flex justify-center gap-2 pointer-events-none">
        {childrenArray.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Go to section ${index + 1}`}
            aria-current={index === internalIndex}
            onClick={() => {
              if (index !== internalIndex) {
                setDirection(index > internalIndex ? -1 : 1)
                setInternalIndex(index)
                onSwipe?.(index)
              }
            }}
            className={`pointer-events-auto w-2 h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 ${index === internalIndex ? 'bg-primary scale-125' : 'bg-gray-400/50'
              }`}
          />
        ))}
      </div>
    </div>
  )
}