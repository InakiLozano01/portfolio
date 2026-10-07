import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Overview from '@/components/admin/pages/Overview'

export const metadata = { title: 'Overview' }

export default async function OverviewPage() {
  const session = await getServerSession(authOptions)
  return <Overview name={session?.user?.name || 'there'} />
}
