'use client'

import React, { useState, useEffect } from 'react'
import Experience from '@/components/sections/Experience'
import Home from '@/components/sections/Home'
import Contact from '@/components/sections/Contact'
import Blog from '@/components/sections/Blog'
import Skills from '@/components/sections/Skills'
import Education from '@/components/sections/Education'
import About from '@/components/sections/About'
import Carousel from '@/components/Carousel'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function Page() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Set initial desktop state
    setIsDesktop(window.innerWidth >= 1024)
    
    // Add resize listener
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sections = [
    { id: 'home', label: 'Home', component: Home },
    { id: 'about', label: 'About', component: About },
    { id: 'education', label: 'Education', component: Education },
    { id: 'experience', label: 'Experience', component: Experience },
    { id: 'skills', label: 'Skills', component: Skills },
    { id: 'blog', label: 'Blog', component: Blog },
    { id: 'contact', label: 'Contact', component: Contact },
  ]

  const handlePrev = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : sections.length - 1
    setCurrentIndex(newIndex)
    window.location.hash = `#${sections[newIndex].id}`
  }

  const handleNext = () => {
    const newIndex = currentIndex < sections.length - 1 ? currentIndex + 1 : 0
    setCurrentIndex(newIndex)
    window.location.hash = `#${sections[newIndex].id}`
  }

  // Update the URL hash when currentIndex changes
  useEffect(() => {
    if (mounted) {
      const sectionId = sections[currentIndex].id
      window.location.hash = `#${sectionId}`
    }
  }, [currentIndex, sections, mounted])

  if (!mounted) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#263547]">
      <Header />
      
      <main className="flex-grow relative">
        <div className="fixed inset-x-0 top-[64px] bottom-[40px] bg-white">
          {isDesktop && (
            <button
              className="fixed left-4 top-1/2 -translate-y-1/2 z-10 bg-[#FD4345] hover:bg-[#ff5456] text-white p-4 rounded-full shadow-lg transition-colors"
              onClick={handlePrev}
              aria-label="Previous section"
            >
              ←
            </button>
          )}
          
          <div className="h-full overflow-hidden">
            <Carousel currentIndex={currentIndex}>
              {sections.map(({ id, component: Component }) => (
                <section key={id} id={id} className="h-full flex items-start justify-center overflow-y-auto">
                  <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-8">
                    <Component />
                  </div>
                </section>
              ))}
            </Carousel>
          </div>

          {isDesktop && (
            <button
              className="fixed right-4 top-1/2 -translate-y-1/2 z-10 bg-[#FD4345] hover:bg-[#ff5456] text-white p-4 rounded-full shadow-lg transition-colors"
              onClick={handleNext}
              aria-label="Next section"
            >
              →
            </button>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

