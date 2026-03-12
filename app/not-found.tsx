import Link from 'next/link'

export default function NotFound() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-cream">
			<div className="bg-white p-8 rounded-xl border border-navy/5 max-w-md w-full text-center">
				<h2 className="text-4xl font-bold text-bordeaux mb-3">404</h2>
				<h3 className="text-lg font-semibold text-navy mb-3">Page not found</h3>
				<p className="text-navy/60 text-sm mb-6">The page you are looking for does not exist or has been moved.</p>
				<Link
					href="/"
					className="inline-block bg-bordeaux hover:bg-bordeaux-light text-cream px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
				>
					Go home
				</Link>
			</div>
		</div>
	)
}
