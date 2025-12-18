import { Suspense } from 'react'
import { UnsubscribeStatusView } from './status-view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeStatusView />
    </Suspense>
  )
}
