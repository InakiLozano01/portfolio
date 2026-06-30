import { Suspense } from 'react'
import { UnsubscribeStatusView } from './status-view'
import { getDictionary } from '@/lib/dictionary'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function UnsubscribePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const resolvedLang = lang === 'es' ? 'es' : 'en'
  const dict = await getDictionary(resolvedLang)

  return (
    <Suspense>
      <UnsubscribeStatusView dict={dict.unsubscribe} lang={resolvedLang} />
    </Suspense>
  )
}
