import '../globals.css'
import './admin.css'
import { AdminProviders } from './providers'
import { Metadata } from 'next'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Portfolio Admin Dashboard',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
        <Script id="admin-ui-theme" strategy="beforeInteractive">
          {`
            try {
              const root = document.documentElement;
              root.setAttribute('data-admin-ui', '');
            } catch (error) {
              console.warn('Unable to initialize admin theme', error);
            }
          `}
        </Script>
        <AdminProviders>
          <div className="admin-ui h-screen overflow-hidden bg-slate-50 text-slate-900">
            {children}
          </div>
        </AdminProviders>
    </>
  )
}
