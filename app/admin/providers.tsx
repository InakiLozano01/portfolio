'use client';

import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { clearAdminCache } from '@/lib/admin-fetch';
import { Toasts } from '@/components/admin/console/Toasts';

export function AdminProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-admin-ui', '');
    return () => { root.removeAttribute('data-admin-ui'); clearAdminCache(); };
  }, []);

  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus>
      {children}
      <Toasts />
    </SessionProvider>
  );
}
