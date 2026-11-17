import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin-auth'
import { isAppHost } from '@/lib/artifacts/route'
import { SLUG_RE } from '@/lib/artifacts/util'
import SharePage from './SharePage'

export const dynamic = 'force-dynamic'

/** The owner's Share button on an artifact lands here: the console's share dialog, on the artifacts origin. */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!isAppHost((await headers()).get('host')) || !SLUG_RE.test(slug)) notFound()
  if (!(await getAdminSession())) redirect(`/${slug}`)
  return <SharePage slug={slug} />
}
