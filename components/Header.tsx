'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'

interface StaticSection {
  id: string;
  label: string;
  component: () => React.ReactElement | null;
}

interface HeaderProps {
  staticSections?: StaticSection[];
  currentIndex?: number;
  onSectionChange?: (index: number) => void;
}

export default function Header({ 
  staticSections = [], 
  currentIndex = 0, 
  onSectionChange = () => {} 
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSectionClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault()
    const sectionIndex = staticSections.findIndex(section => section.id === sectionId)
    if (sectionIndex !== -1) {
      onSectionChange(sectionIndex)
      setIsMenuOpen(false)
    }
  }

  // Close menu when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!staticSections || staticSections.length === 0) {
    return null
  }

  return (
    <header className="h-[48px] md:h-[56px] flex-shrink-0 bg-[#1a2433] text-white z-50">
      <nav className="h-full container mx-auto px-4">
        <div className="h-full flex justify-between items-center">
          <Link href="/" className="text-lg md:text-xl font-bold text-white truncate max-w-[200px] md:max-w-none flex items-center gap-2" aria-label="Home">
            <Image
              src="/favicon-32x32.png"
              alt="Logo"
              width={24}
              height={24}
              className="rounded-sm"
            />
            Iñaki F. Lozano
          </Link>
          
          {/* Mobile menu button */}
          <button
            className="md:hidden text-white hover:text-[#FF5456] transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Desktop navigation */}
          <div className="hidden md:flex space-x-6" aria-label="Main navigation">
            {staticSections.map((section, index) => {
              const isActive = index === currentIndex
              return (
                <a
                  key={section.id}
                  href={section.id === 'home' ? '/' : `/#${section.id}`}
                  onClick={(e) => handleSectionClick(e, section.id)}
                  className={`hover:text-[#FF5456] transition-colors cursor-pointer ${
                    isActive ? 'text-[#FF5456]' : 'text-white'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {section.label}
                </a>
              )
            })}
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <nav
              id="mobile-menu"
              className="absolute top-[48px] left-0 right-0 bg-[#1a2433] p-4 md:hidden"
              aria-label="Mobile navigation"
            >
              {staticSections.map((section, index) => {
                const isActive = index === currentIndex
                return (
                  <a
                    key={section.id}
                    href={section.id === 'home' ? '/' : `/#${section.id}`}
                    onClick={(e) => {
                      handleSectionClick(e, section.id)
                      setIsMenuOpen(false)
                    }}
                    className={`block py-2 hover:text-[#FF5456] transition-colors ${
                      isActive ? 'text-[#FF5456]' : 'text-white'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {section.label}
                  </a>
                )
              })}
            </nav>
          )}
        </div>
      </nav>
    </header>
  )
}
