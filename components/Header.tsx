'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const navItems = [
  { name: 'Home', href: '#home' },
  { name: 'About', href: '#about' },
  { name: 'Education', href: '#education' },
  { name: 'Experience', href: '#experience' },
  { name: 'Skills', href: '#skills' },
  { name: 'Blog', href: '#blog' },
  { name: 'Contact', href: '#contact' },
]

export default function Header() {
  const [activeSection, setActiveSection] = useState('home')

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'home'
      setActiveSection(hash)
    }

    handleHashChange() // Initial check
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#263547] shadow-md">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <ul className="flex flex-wrap justify-center space-x-4 md:space-x-6">
            {navItems.slice(0, -1).map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault()
                    window.location.hash = item.href
                  }}
                  className={`text-sm font-medium transition-colors duration-200 ${
                    activeSection === item.href.slice(1)
                      ? 'text-[#FD4345] font-semibold'
                      : 'text-white hover:text-[#FD4345]'
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex justify-center mt-2 md:mt-0">
            <Link
              href={navItems[navItems.length - 1].href}
              onClick={(e) => {
                e.preventDefault()
                window.location.hash = navItems[navItems.length - 1].href
              }}
              className={`text-sm font-medium transition-colors duration-200 ${
                activeSection === navItems[navItems.length - 1].href.slice(1)
                  ? 'text-[#FD4345] font-semibold'
                  : 'text-white hover:text-[#FD4345]'
              }`}
            >
              {navItems[navItems.length - 1].name}
            </Link>
          </div>
          <Link
            href="/login"
            className="hidden md:block text-sm text-white hover:text-[#FD4345] transition-colors duration-200"
          >
            Admin Login
          </Link>
        </div>
      </nav>
    </header>
  )
}

