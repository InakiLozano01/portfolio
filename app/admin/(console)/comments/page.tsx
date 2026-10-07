import { Suspense } from 'react'
import Comments from '@/components/admin/pages/Comments'

export const metadata = { title: 'Comments' }

export default function CommentsPage() {
  return (
    <Suspense>
      <Comments />
    </Suspense>
  )
}
