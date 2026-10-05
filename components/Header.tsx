'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import LanguageSwitcher from './LanguageSwitcher'

interface StaticSection {
  id: string;
  label: string;
}

interface HeaderProps {
  staticSections?: StaticSection[];
  currentIndex?: number;
  onSectionChange?: (index: number) => void;
  dictionary?: any;
  languageSwitcherDict?: any;
  lang?: string;
}

export default function Header({
  staticSections = [],
  currentIndex = 0,
  onSectionChange = () => { },
  dictionary = {},
  languageSwitcherDict = {},
  lang = 'en'
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLElement | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)

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
    if (!isMenuOpen) return

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isMenuOpen])

  // Close on Escape and prevent body scroll when open
  useEffect(() => {
    if (!isMenuOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('overflow-hidden')

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
    <header className="sticky top-0 h-14 lg:h-[72px] bg-navy text-cream z-50 shadow-sm">
      {/* Skip to content link */}
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:bg-white focus:text-black focus:px-3 focus:py-1 focus:rounded focus:z-50"
      >
        {dictionary.skipToContent || 'Skip to content'}
      </a>
      <nav className="h-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-full flex justify-between items-center">
          <a
            href={`/${lang}`}
            className="text-lg md:text-xl font-bold text-white truncate max-w-[200px] md:max-w-none flex items-center gap-2"
            aria-label={`Iñaki F. Lozano ${dictionary.home || 'Home'}`}
          >
            <Image
              src="/il-logo-mark.png"
              alt="Iñaki F. Lozano logo"
              width={26}
              height={26}
              priority
            />
            Iñaki F. Lozano
          </a>

          <div className="flex items-center gap-4">
            {/* Desktop navigation */}
            <div className="hidden lg:flex gap-1" aria-label={dictionary.mainNavigation || 'Main navigation'}>
              {staticSections.map((section, index) => {
                const isActive = index === currentIndex
                return (
                  <a
                    key={section.id}
                    href={section.id === 'home' ? `/${lang}` : `/${lang}#${section.id}`}
                    onClick={(e) => handleSectionClick(e, section.id)}
                    className={`px-2 py-2 rounded text-sm font-medium hover:text-cream transition-colors cursor-pointer ${isActive ? 'text-cream underline decoration-[#FF5456] decoration-2 underline-offset-8' : 'text-cream/80'
                      }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {section.label}
                  </a>
                )
              })}
            </div>

            <div className="hidden lg:block">
              <LanguageSwitcher lang={lang} dict={languageSwitcherDict} />
            </div>

            {/* Mobile menu button */}
            <button
              ref={menuButtonRef}
              className="lg:hidden text-cream p-2 rounded hover:bg-cream/10 transition-colors"
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
                className="fixed inset-0 bg-black/40 lg:hidden z-40"
                onClick={() => setIsMenuOpen(false)}
                tabIndex={-1}
              />
              <nav
                ref={menuRef}
                id="mobile-menu"
                className="absolute top-14 left-0 right-0 bg-navy p-4 lg:hidden shadow-lg z-50 max-h-[calc(100dvh-56px)] overflow-y-auto"
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
                      className={`block py-3 px-4 rounded-lg hover:bg-cream/10 transition-colors ${isActive ? 'text-cream bg-cream/10' : 'text-cream/80'
                        }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {section.label}
                    </a>
                  )
                })}
                <div className="py-4 border-t border-gray-700 mt-2">
                  <LanguageSwitcher lang={lang} dict={languageSwitcherDict} />
                </div>
              </nav>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
