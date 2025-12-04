'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'
import LanguageSwitcher from './LanguageSwitcher'

interface StaticSection {
  id: string;
  label: string;
  component: () => React.ReactElement | null;
}

interface HeaderProps {
  staticSections?: StaticSection[];
  currentIndex?: number;
  onSectionChange?: (index: number) => void;
  dictionary?: any;
  lang?: string;
}

export default function Header({
  staticSections = [],
  currentIndex = 0,
  onSectionChange = () => { },
  dictionary = {},
  lang = 'en'
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

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

  // Close on Escape and prevent body scroll when open
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    if (isMenuOpen) {
      document.body.classList.add('overflow-hidden')
    } else {
      document.body.classList.remove('overflow-hidden')
    }
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('overflow-hidden')
    }
  }, [isMenuOpen])

  // Focus trap within mobile menu
  useEffect(() => {
    if (!isMenuOpen || !menuRef.current) return
    const menuEl = menuRef.current
    const focusFirst = () => {
      const first = menuEl.querySelector<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])')
      first?.focus()
    }
    focusFirst()
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusables = menuEl.querySelectorAll<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])')
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [isMenuOpen])

  if (!staticSections || staticSections.length === 0) {
    return null
  }

  return (
    <header className="h-[48px] md:h-[56px] flex-shrink-0 bg-[#1a2433] text-white z-50 relative">
      {/* Skip to content link */}
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:bg-white focus:text-black focus:px-3 focus:py-1 focus:rounded focus:z-50"
      >
        {dictionary.skipToContent || 'Skip to content'}
      </a>
      <nav className="h-full container mx-auto px-4">
        <div className="h-full flex justify-between items-center">
          <Link href={`/${lang}`} className="text-lg md:text-xl font-bold text-white truncate max-w-[200px] md:max-w-none flex items-center gap-2" aria-label={dictionary.home || 'Home'}>
            <Image
              src="/inakilozanodotcomlogo.png"
              alt="Logo"
              width={24}
              height={24}
              className="rounded-sm"
            />
            Iñaki F. Lozano
          </Link>

          <div className="flex items-center gap-4">
            {/* Desktop navigation */}
            <div className="hidden md:flex space-x-6" aria-label={dictionary.mainNavigation || 'Main navigation'}>
              {staticSections.map((section, index) => {
                const isActive = index === currentIndex
                return (
                  <a
                    key={section.id}
                    href={section.id === 'home' ? `/${lang}` : `/${lang}#${section.id}`}
                    onClick={(e) => handleSectionClick(e, section.id)}
                    className={`hover:text-[#FF5456] transition-colors cursor-pointer ${isActive ? 'text-[#FF5456]' : 'text-white'
                      }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {section.label}
                  </a>
                )
              })}
            </div>

            <div className="hidden md:block">
              <LanguageSwitcher lang={lang} />
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-white hover:text-[#FF5456] transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? (dictionary.closeMenu || 'Close menu') : (dictionary.openMenu || 'Open menu')}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <>
              {/* Backdrop overlay */}
              <button
                aria-hidden="true"
                className="fixed inset-0 bg-black/40 md:hidden z-40"
                onClick={() => setIsMenuOpen(false)}
                tabIndex={-1}
              />
              <nav
                ref={menuRef}
                id="mobile-menu"
                className="absolute top-[48px] left-0 right-0 bg-[#1a2433] p-4 md:hidden shadow-lg z-50"
                aria-label={dictionary.mobileNavigation || 'Mobile navigation'}
              >
                {staticSections.map((section, index) => {
                  const isActive = index === currentIndex
                  return (
                    <a
                      key={section.id}
                      href={section.id === 'home' ? `/${lang}` : `/${lang}#${section.id}`}
                      onClick={(e) => {
                        handleSectionClick(e, section.id)
                        setIsMenuOpen(false)
                      }}
                      className={`block py-2 hover:text-[#FF5456] transition-colors ${isActive ? 'text-[#FF5456]' : 'text-white'
                        }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {section.label}
                    </a>
                  )
                })}
                <div className="py-4 border-t border-gray-700 mt-2">
                  <LanguageSwitcher lang={lang} />
                </div>
              </nav>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
