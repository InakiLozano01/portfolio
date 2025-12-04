import { Suspense } from 'react'
import { UnsubscribeStatusView } from './status-view'

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeStatusView />
    </Suspense>
  )
}
