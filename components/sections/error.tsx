'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import en from '@/dictionaries/en.json'
import es from '@/dictionaries/es.json'

interface ErrorProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export default function SectionError({ error, resetErrorBoundary }: ErrorProps) {
  const pathname = usePathname()
  const lang = pathname?.split('/')[1] === 'es' ? 'es' : 'en'
  const dict = (lang === 'es' ? es : en).sectionError

  React.useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="bg-white p-8 rounded-xl border border-navy/15 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">{dict?.title || 'Section Error'}</h2>
        <p className="text-gray-600 mb-4">{error.message || dict?.fallback || 'An error occurred while loading this section.'}</p>
        <button
          onClick={resetErrorBoundary}
          className="bg-[#800020] text-white px-4 py-2 rounded hover:bg-[#600018] transition-colors"
        >
          {dict?.tryAgain || 'Try again'}
        </button>
      </div>
    </div>
  )
}
