import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
}

export default async function ProjectsIndexPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const resolved = lang === 'es' ? 'es' : 'en'
  redirect(`/${resolved}#projects`)
}
