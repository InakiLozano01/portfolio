'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h2>
            <p className="text-gray-600 mb-6">A critical error occurred. Please try refreshing the page.</p>
            <button
              onClick={reset}
              className="bg-[#800020] text-white px-6 py-2 rounded hover:bg-[#600018] transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
} 