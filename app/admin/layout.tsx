import '../globals.css'
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
        <Script id="admin-force-light" strategy="beforeInteractive">
          {`
            try {
              const root = document.documentElement;
              root.classList.remove('dark');
              root.classList.add('light');
              root.style.colorScheme = 'light';
              localStorage.setItem('theme', 'light');
            } catch (error) {
              console.warn('Unable to force admin light mode', error);
            }
          `}
        </Script>
        <AdminProviders>
          <div className="h-screen overflow-hidden bg-slate-50">
            {children}
          </div>
        </AdminProviders>
    </>
  )
}
