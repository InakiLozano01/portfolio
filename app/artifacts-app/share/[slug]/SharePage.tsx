'use client'

import { useEffect } from 'react'
import { ConfirmProvider } from '@/components/admin/console/data'
import { Toasts } from '@/components/admin/console/Toasts'
import ArtifactShareDialog from '@/components/admin/pages/ArtifactShareDialog'

export default function SharePage({ slug }: { slug: string }) {
  useEffect(() => document.documentElement.setAttribute('data-admin-ui', ''), [])
  return (
    <ConfirmProvider>
      {/* The artifact's viewer is a route handler, not a Next page, so leaving needs a full navigation. */}
      {/* eslint-disable-next-line @next/next/no-location-assign-relative-destination */}
      <ArtifactShareDialog artifact={slug} apiBase="/api/v1" onClose={() => { window.location.href = `/${slug}` }} />
      <Toasts />
    </ConfirmProvider>
  )
}
