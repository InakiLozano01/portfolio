import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export default async function AdminBlogPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/admin/login?callbackUrl=/admin%23blogs')
  }

  redirect('/admin#blogs')
}
