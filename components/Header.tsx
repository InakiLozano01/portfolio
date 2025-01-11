'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
  const handleSectionClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault()
    const sectionIndex = staticSections.findIndex(section => section.id === sectionId)
    if (sectionIndex !== -1) {
      onSectionChange(sectionIndex)
    }
  }

  if (!staticSections || staticSections.length === 0) {
    return null
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#1a2433] text-white z-50">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-[#ce1043]">
            Iñaki Fernando Lozano
          </Link>
          <div className="flex space-x-6">
            {staticSections.map((section, index) => {
              const isActive = index === currentIndex
              return (
                <a
                  key={section.id}
                  href={section.id === 'home' ? '/' : `/#${section.id}`}
                  onClick={(e) => handleSectionClick(e, section.id)}
                  className={`hover:text-[#ce1043] transition-colors cursor-pointer ${
                    isActive ? 'text-[#ce1043]' : ''
                  }`}
                >
                  {section.label}
                </a>
              )
            })}
          </div>
        </div>
      </nav>
    </header>
  )
}
