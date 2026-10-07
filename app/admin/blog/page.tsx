import { redirect } from 'next/navigation'

export default function LegacyBlogPage() {
  redirect('/admin/posts')
}
