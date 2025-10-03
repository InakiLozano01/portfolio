'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
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

// Dynamically import section components
const sectionComponents: Record<string, () => Promise<any>> = {
  'home': () => import('@/components/sections/Home'),
  'about': () => import('@/components/sections/About'),
  'education': () => import('@/components/sections/Education'),
  'experience': () => import('@/components/sections/Experience'),
  'skills': () => import('@/components/sections/Skills'),
  'projects': () => import('@/components/sections/Projects'),
  'blog': () => import('@/components/sections/Blog'),
  'contact': () => import('@/components/sections/Contact'),
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
        const uiSections = await Promise.all(
          data
            .filter(section => section.visible)
            .sort((a, b) => a.order - b.order)
            .map(async section => {
              const id = section.title.toLowerCase();
              const importComponent = sectionComponents[id];

              if (!importComponent) return null;

              try {
                const module = await importComponent();
                return {
                  id,
                  label: section.title,
                  component: module.default
                };
              } catch (error) {
                console.error(`Failed to load component for section ${id}:`, error);
                return null;
              }
            })
        );

        // Filter out null values from failed imports
        setSections(uiSections.filter((section): section is Section => section !== null));
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
    } else if (sections.length > 0) {
      // Reset to first section if no hash
      setCurrentIndex(0)
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

  useEffect(() => {
    const currentSectionId = sections[currentIndex]?.id
    if (!currentSectionId) return

    setTimeout(() => {
      const currentSectionEl = document.getElementById(currentSectionId)
      if (currentSectionEl) {
        currentSectionEl.scrollTo({ top: 0, behavior: 'auto' })
      }
    }, 50)
  }, [currentIndex, sections])

  const getSectionContainerClasses = (id: string) => {
    const basePadding = 'w-full px-4 md:px-8'
    
    // Custom padding for about section on mobile
    let verticalPadding = isDesktop ? 'py-10 md:py-12' : 'pt-16 pb-20'
    if (!isDesktop && id === 'about') {
      verticalPadding = 'pt-4 pb-12' // Minimal top padding for about on mobile
    }
    
    const layout = isDesktop
      ? `min-h-full flex flex-col items-stretch ${id === 'home' ? 'justify-center' : 'justify-start'}`.trim()
      : `min-h-[calc(100vh-48px-40px)] flex flex-col ${id === 'about' ? 'justify-start' : ''}`
    
    let additional = ''
    if (id === 'skills') {
      additional = isDesktop ? 'pb-20' : 'pb-32'
    } else if (id === 'experience') {
      additional = isDesktop ? 'md:pb-40' : 'pb-20'
    }
    
    return `${basePadding} ${verticalPadding} ${layout} ${additional}`
  }

  const getInnerWrapperClasses = (id: string) => {
    const base = 'w-full max-w-6xl mx-auto'
    if (id === 'about') return `${base} md:px-12`
    return base
  }

  if (!mounted || loading) return null

  return (
    <div className="flex flex-col min-h-screen md:h-screen md:overflow-hidden bg-[#263547]">
      <Header staticSections={sections} currentIndex={currentIndex} onSectionChange={updateSection} />

      <main className="flex-grow relative bg-white overflow-hidden">
        <div className="md:absolute md:inset-0">
          <div className="fixed inset-0 top-[48px] bottom-[40px] md:absolute md:inset-0 md:top-0 md:bottom-0 z-0 pointer-events-none">
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

          <div className="h-[calc(100vh-48px-40px)] md:h-full md:overflow-hidden z-10">
            <Carousel
              currentIndex={currentIndex}
              onSwipe={updateSection}
            >
              {sections.map(({ id, component: Component }) => (
                <section
                  key={id}
                  id={id}
                  className="h-full relative z-10 overflow-y-auto overflow-x-hidden"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <div className={getSectionContainerClasses(id)}>
                    <div className={getInnerWrapperClasses(id)}>
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

