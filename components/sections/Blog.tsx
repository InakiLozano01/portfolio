'use client'

import BlogSection from './BlogSection'

export default function Blog({ lang = 'en' }: { lang?: 'en' | 'es' }) {
	return (
		<div className="w-full">
			<BlogSection lang={lang} />
		</div>
	)
}
