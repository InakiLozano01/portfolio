import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'

export default async function AdminBlogPage() {
  const session = await getServerSession()

  if (!session) {
    redirect('/api/auth/signin')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Blog Administration</h1>
      {/* Add your blog administration components here */}
    </div>
  )
} 