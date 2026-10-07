import { Suspense } from 'react'
import Posts from '@/components/admin/pages/Posts'

export const metadata = { title: 'Writing' }

export default function PostsPage() {
  return (
    <Suspense>
      <Posts />
    </Suspense>
  )
}
