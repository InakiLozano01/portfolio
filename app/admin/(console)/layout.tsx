import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin-auth'
import Console from '@/components/admin/console/Shell'

export const dynamic = 'force-dynamic'

/** Every console page is checked on the server too, not only by the proxy. */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login?expired=1')
  return <Console user={{ name: session.user.name || 'Admin', email: session.user.email }}>{children}</Console>
}
