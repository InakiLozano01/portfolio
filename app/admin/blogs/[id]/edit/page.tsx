import { redirect } from 'next/navigation'

export default async function LegacyEditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/admin/posts/${encodeURIComponent(id)}`)
}
