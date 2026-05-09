'use client'

import type { HomeContent } from '@/models/Section'
import TextWithEmoji from '@/components/ui/TextWithEmoji'

interface HomePageProps {
  lang?: 'en' | 'es';
  initialContent?: HomeContent | null;
}

export default function HomePage({ lang = 'en', initialContent = null }: HomePageProps) {
  if (!initialContent) return null

  // Get localized content
  const headline = (lang === 'en' ? initialContent.headline_en : initialContent.headline_es) || initialContent.headline
  const description = (lang === 'en' ? initialContent.description_en : initialContent.description_es) || initialContent.description

  return (
    <div className="w-full flex flex-col items-center justify-center py-10 md:py-0">
      <div className="container mx-auto px-4 text-center max-w-3xl">
        <h1
          className="text-4xl md:text-6xl font-bold mb-6 text-primary"
        >
          <TextWithEmoji text={headline} />
        </h1>
        <p
          className="text-xl mb-8 text-gray-600 leading-relaxed"
        >
          <TextWithEmoji text={description} />
        </p>
      </div>
    </div>
  )
}
