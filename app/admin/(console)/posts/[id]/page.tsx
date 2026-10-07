import { notFound } from 'next/navigation'
import PostEditor from '@/components/admin/pages/PostEditor'

export const metadata = { title: 'Edit post' }

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[a-f0-9]{24}$/i.test(id)) notFound()
  return <PostEditor key={id} id={id} />
}
