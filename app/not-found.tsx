import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h2 className="text-3xl font-bold text-[#800020] mb-4">404</h2>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Page Not Found</h3>
        <p className="text-gray-600 mb-6">The page you're looking for doesn't exist or has been moved.</p>
        <Link 
          href="/"
          className="inline-block bg-[#800020] text-white px-6 py-2 rounded hover:bg-[#600018] transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
} 