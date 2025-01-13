'use client'

import React, { useState, useEffect, useCallback, TouchEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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

  const childrenArray = React.Children.toArray(children)

  useEffect(() => {
    setWindowWidth(window.innerWidth)
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
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={internalIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="absolute w-full h-full"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {childrenArray[internalIndex]}
        </motion.div>
      </AnimatePresence>
      <div className="absolute bottom-4 md:bottom-4 left-0 right-0 flex justify-center gap-2 mb-8 md:mb-0">
        {childrenArray.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === internalIndex
                ? 'bg-primary scale-125'
                : 'bg-gray-400/50'
            }`}
          />
        ))}
      </div>
    </div>
  )
}