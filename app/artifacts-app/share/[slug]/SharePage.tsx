'use client'

import { useEffect } from 'react'
import { ConfirmProvider } from '@/components/admin/console/data'
import { Toasts } from '@/components/admin/console/Toasts'
import ArtifactShareDialog from '@/components/admin/pages/ArtifactShareDialog'

const framed = () => typeof window !== 'undefined' && window.parent !== window

export default function SharePage({ slug }: { slug: string }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-admin-ui', '')
    // Over the artifact (framed by its shell), only the dialog and its backdrop should cover it.
    if (framed()) for (const el of [document.documentElement, document.body]) el.style.background = 'transparent'
  }, [])
  const close = () => {
    // The shell that framed this page removes it; opened on its own, go back to the artifact with a full navigation.
    if (framed()) window.parent.postMessage({ shareClosed: true }, window.location.origin)
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    else window.location.href = `/${slug}`
  }
  return (
    <ConfirmProvider>
      <ArtifactShareDialog artifact={slug} apiBase="/api/v1" onClose={close} />
      <Toasts />
    </ConfirmProvider>
  )
}
