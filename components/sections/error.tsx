'use client'

import React from 'react'

interface ErrorProps {
	error: Error
	resetErrorBoundary: () => void
}

export default function SectionError({ error, resetErrorBoundary }: ErrorProps) {
	React.useEffect(() => {
		console.error(error)
	}, [error])

	return (
		<div className="min-h-screen flex items-center justify-center bg-cream">
			<div className="bg-white p-8 rounded-xl border border-navy/5 max-w-md w-full text-center">
				<h2 className="text-xl font-bold text-bordeaux mb-3">Something went wrong</h2>
				<p className="text-navy/60 text-sm mb-6">{error.message || 'An error occurred while loading this section.'}</p>
				<button
					onClick={resetErrorBoundary}
					className="bg-bordeaux hover:bg-bordeaux-light text-cream px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
				>
					Try again
				</button>
			</div>
		</div>
	)
}
