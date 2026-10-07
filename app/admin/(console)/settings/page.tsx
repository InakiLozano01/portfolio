import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Settings from '@/components/admin/pages/Settings'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  return <Settings user={{ name: session?.user?.name || 'Admin', email: session?.user?.email || '' }} />
}
