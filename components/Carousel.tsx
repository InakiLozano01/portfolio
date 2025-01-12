'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'

interface CarouselProps {
  children: React.ReactNode;
  currentIndex: number;
  onSwipe?: (newIndex: number) => void;
}

export default function Carousel({ 
  children,
  currentIndex: externalIndex,
  onSwipe
}: CarouselProps) {
  const [internalIndex, setInternalIndex] = useState(0)
  const [dragStart, setDragStart] = useState(0)
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
    }

    const debouncedResize = debounce(handleResize, 100)
    window.addEventListener('resize', debouncedResize)
    return () => window.removeEventListener('resize', debouncedResize)
  }, [])

  const handleDragStart = () => {
    setDragStart(internalIndex)
  }

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = windowWidth * 0.2 // 20% of screen width
    const dragDistance = info.offset.x
    const dragDirection = info.offset.x < 0 ? 1 : -1

    if (Math.abs(dragDistance) > swipeThreshold) {
      const newIndex = dragDirection > 0 
        ? Math.min(dragStart + 1, childrenArray.length - 1)
        : Math.max(dragStart - 1, 0)
      
      if (onSwipe) {
        onSwipe(newIndex)
      }
    }
  }

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
    <div className="relative w-full h-full overflow-hidden touch-pan-y">
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
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
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

