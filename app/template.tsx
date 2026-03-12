'use client'

import { Component, ReactNode } from 'react'

interface ErrorBoundaryProps {
	children: ReactNode
}

interface ErrorBoundaryState {
	hasError: boolean
	error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props)
		this.state = { hasError: false, error: null }
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error }
	}

	resetError = () => {
		this.setState({ hasError: false, error: null })
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen flex items-center justify-center bg-cream">
					<div className="bg-white p-8 rounded-xl border border-navy/5 max-w-md w-full text-center">
						<h2 className="text-xl font-bold text-bordeaux mb-3">Something went wrong</h2>
						<p className="text-navy/60 text-sm mb-6">{this.state.error?.message || 'An unexpected error occurred.'}</p>
						<button
							onClick={this.resetError}
							className="bg-bordeaux hover:bg-bordeaux-light text-cream px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
						>
							Try again
						</button>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}

export default function Template({ children }: { children: React.ReactNode }) {
	return (
		<ErrorBoundary>
			{children}
		</ErrorBoundary>
	)
}
