import { Suspense } from 'react'
import Site from '@/components/admin/pages/Site'

export const metadata = { title: 'Site pages' }

export default function SitePage() {
  return (
    <Suspense>
      <Site />
    </Suspense>
  )
}
