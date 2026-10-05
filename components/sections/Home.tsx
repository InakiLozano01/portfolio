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
    <div className="w-full min-h-[calc(100dvh-56px)] lg:min-h-[calc(100dvh-72px)] flex flex-col items-center justify-center px-4 py-20">
      <div className="container mx-auto px-4 text-center max-w-3xl">
        <h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-cream tracking-display leading-tight text-balance"
        >
          <TextWithEmoji text={headline} />
        </h1>
        <p
          className="text-lg sm:text-xl mb-10 text-cream/80 leading-relaxed text-balance"
        >
          <TextWithEmoji text={description} />
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="#contact" className="rounded-lg bg-bordeaux hover:bg-bordeaux-light text-cream px-6 py-3 font-medium">
            {lang === 'es' ? 'Contáctame' : 'Get in touch'}
          </a>
          <a href="#projects" className="rounded-lg border border-cream/40 hover:bg-cream/10 text-cream px-6 py-3 font-medium">
            {lang === 'es' ? 'Ver proyectos' : 'View work'}
          </a>
        </div>
      </div>
    </div>
  )
}
