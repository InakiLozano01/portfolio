'use client'

import React, { useState, useEffect } from 'react'
import Home from '@/components/sections/Home'
import Experience from '@/components/sections/Experience'
import Contact from '@/components/sections/Contact'
import Blog from '@/components/sections/Blog'
import Skills from '@/components/sections/Skills'
import Education from '@/components/sections/Education'
import About from '@/components/sections/About'
import Carousel from '@/components/Carousel'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface Section {
  id: string;
  label: string;
  component: () => React.ReactElement | null;
}

interface DBSection {
  _id: string;
  title: string;
  order: number;
  visible: boolean;
  content: Record<string, any>;
}

const sectionComponents: Record<string, () => React.ReactElement | null> = {
  'home': Home,
  'about': About,
  'education': Education,
  'experience': Experience,
  'skills': Skills,
  'blog': Blog,
  'contact': Contact,
}

export default function Page() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDesktop, setIsDesktop] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const response = await fetch('/api/sections');
        if (!response.ok) {
          throw new Error('Failed to fetch sections');
        }
        const data: DBSection[] = await response.json();

        // Convert DB sections to UI sections and filter out sections without components
        const uiSections = data
          .filter(section => section.visible)
          .sort((a, b) => a.order - b.order)
          .map(section => ({
            id: section.title.toLowerCase(),
            label: section.title,
            component: sectionComponents[section.title.toLowerCase()]
          }))
          .filter(section => section.component); // Only keep sections that have a component

        setSections(uiSections);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching sections:', error);
        setLoading(false);
      }
    };

    fetchSections();
  }, []);

  useEffect(() => {
    setMounted(true)
    // Set initial desktop state and handle hash
    setIsDesktop(window.innerWidth >= 768)
    const hash = window.location.hash.slice(1)
    if (hash && sections.length > 0) {
      const sectionIndex = sections.findIndex(section => section.id === hash)
      if (sectionIndex !== -1) {
        setCurrentIndex(sectionIndex)
      }
    }

    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768)
    }

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      const sectionIndex = sections.findIndex(section => section.id === hash)
      if (sectionIndex !== -1) {
        setCurrentIndex(sectionIndex)
      }
    }

    const debouncedResize = debounce(handleResize, 100)
    window.addEventListener('resize', debouncedResize)
    window.addEventListener('hashchange', handleHashChange)
    return () => {
      window.removeEventListener('resize', debouncedResize)
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [sections])

  const updateSection = (newIndex: number) => {
    setCurrentIndex(newIndex)
    const newHash = sections[newIndex]?.id === 'home' ? '' : `#${sections[newIndex]?.id}`
    window.history.pushState(null, '', newHash || '/')
  }

  const handlePrev = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : sections.length - 1
    updateSection(newIndex)
  }

  const handleNext = () => {
    const newIndex = currentIndex < sections.length - 1 ? currentIndex + 1 : 0
    updateSection(newIndex)
  }

  if (!mounted || loading) return null

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#263547]">
      <Header staticSections={sections} currentIndex={currentIndex} onSectionChange={updateSection} />

      <main className="flex-grow relative">
        <div className="absolute inset-0 bg-white">
          <div className="absolute inset-0 z-0">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E5E5" strokeWidth="1.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {isDesktop && sections.length > 1 && (
            <button
              className="fixed left-4 top-1/2 -translate-y-1/2 z-20 bg-[#FD4345] hover:bg-[#ff5456] text-white p-4 rounded-full shadow-lg transition-colors"
              onClick={handlePrev}
              aria-label="Previous section"
            >
              ←
            </button>
          )}

          <div className="h-full">
            <Carousel
              currentIndex={currentIndex}
              onSwipe={updateSection}
            >
              {sections.map(({ id, component: Component }) => (
                <section key={id} id={id} className="h-full relative z-10 overflow-y-auto">
                  <div className={`w-full px-4 md:px-8 py-8 md:py-12 ${id === 'skills' ? 'min-h-full' : 'h-full flex items-center justify-center'
                    }`}>
                    <div className={`w-full max-w-6xl mx-auto ${id === 'about' ? 'md:px-12' : ''}`}>
                      <Component />
                    </div>
                  </div>
                </section>
              ))}
            </Carousel>
          </div>

          {isDesktop && sections.length > 1 && (
            <button
              className="fixed right-4 top-1/2 -translate-y-1/2 z-20 bg-[#FD4345] hover:bg-[#ff5456] text-white p-4 rounded-full shadow-lg transition-colors"
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

