'use client'

import React from 'react'
import { FallbackProps } from 'react-error-boundary'

export default function SectionError({ error, resetErrorBoundary }: FallbackProps) {
  React.useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Section Error</h2>
        <p className="text-gray-600 mb-4">{error.message || 'An error occurred while loading this section.'}</p>
        <button
          onClick={resetErrorBoundary}
          className="bg-[#800020] text-white px-4 py-2 rounded hover:bg-[#600018] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
} 