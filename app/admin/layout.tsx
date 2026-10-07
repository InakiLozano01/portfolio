import '../globals.css'
import './admin.css'
import { AdminProviders } from './providers'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Console', template: '%s · Console' },
  description: 'Portfolio admin console',
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminProviders>{children}</AdminProviders>
}
