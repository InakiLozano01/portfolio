'use client'

import { ErrorBoundary } from 'react-error-boundary'

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h2>
        <p className="text-gray-600 mb-6">{error.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={resetErrorBoundary}
          className="bg-[#800020] text-white px-6 py-2 rounded hover:bg-[#600018] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ErrorBoundary>
  )
} 