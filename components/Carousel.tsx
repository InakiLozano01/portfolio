'use client'

import React, { useCallback, useRef, TouchEvent, KeyboardEvent } from 'react'

interface CarouselProps {
  children: React.ReactNode
  currentIndex: number
  onSwipe?: (newIndex: number) => void
}

export default function Carousel({
  children,
  currentIndex,
  onSwipe,
}: CarouselProps) {
  const touchStartRef = useRef(0)
  const touchEndRef = useRef(0)

  const childrenArray = React.Children.toArray(children)

  const handleTouchStart = (e: TouchEvent) => {
    touchEndRef.current = 0
    touchStartRef.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = useCallback(() => {
    const touchStart = touchStartRef.current
    const touchEnd = touchEndRef.current
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe || isRightSwipe) {
      const direction = isLeftSwipe ? 1 : -1
      const newIndex = currentIndex + direction

      if (newIndex >= 0 && newIndex < childrenArray.length) {
        onSwipe?.(newIndex)
      }
    }

    touchStartRef.current = 0
    touchEndRef.current = 0
  }, [currentIndex, childrenArray.length, onSwipe])

  return (
    <div
      className="relative w-full h-full overflow-hidden touch-pan-y"
      role="region"
      aria-roledescription="carousel"
      aria-label="Sections"
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'ArrowLeft') {
          const prev = currentIndex - 1
          if (prev >= 0) {
            onSwipe?.(prev)
          }
        } else if (e.key === 'ArrowRight') {
          const next = currentIndex + 1
          if (next < childrenArray.length) {
            onSwipe?.(next)
          }
        }
      }}
      tabIndex={0}
      aria-live="polite"
    >
      <div
        key={currentIndex}
        className="absolute inset-0 w-full h-full touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {childrenArray[currentIndex]}
      </div>
      <div className="absolute left-0 right-0 bottom-4 md:bottom-6 flex justify-center gap-2 pointer-events-none">
        {childrenArray.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Go to section ${index + 1}`}
            aria-current={index === currentIndex}
            onClick={() => {
              if (index !== currentIndex) {
                onSwipe?.(index)
              }
            }}
            className={`pointer-events-auto w-2 h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 ${index === currentIndex ? 'bg-primary scale-125' : 'bg-gray-400/50'
              }`}
          />
        ))}
      </div>
    </div>
  )
}
