'use client';

import { useEffect } from 'react';
import { clearAdminCache } from '@/lib/admin-fetch';
import { SessionProvider } from 'next-auth/react';
import { ToastProvider as CustomToastProvider } from '@/components/ui/use-toast';
import { ToastProvider, ToastViewport } from '@/components/ui/toast';
import { CustomToaster } from '@/components/ui/custom-toaster';
import { Toaster } from '@/components/ui/sonner';

export function AdminProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-admin-ui', '');
    return () => { root.removeAttribute('data-admin-ui'); clearAdminCache(); };
  }, []);

  return (
    <SessionProvider refetchInterval={0}>
      <ToastProvider>
        <CustomToastProvider>
          {children}
          <ToastViewport />
          <CustomToaster />
        </CustomToastProvider>
        <Toaster theme="light" />
      </ToastProvider>
    </SessionProvider>
  );
}
