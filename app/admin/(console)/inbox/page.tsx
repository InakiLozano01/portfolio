import { Suspense } from 'react'
import Inbox from '@/components/admin/pages/Inbox'

export const metadata = { title: 'Inbox' }

export default function InboxPage() {
  return (
    <Suspense>
      <Inbox />
    </Suspense>
  )
}
