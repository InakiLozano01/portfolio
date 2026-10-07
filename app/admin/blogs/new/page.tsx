import { redirect } from 'next/navigation'

export default function LegacyNewBlogPage() {
  redirect('/admin/posts/new')
}
