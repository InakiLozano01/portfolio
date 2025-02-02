'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider as CustomToastProvider } from '@/components/ui/use-toast';
import { ToastProvider, ToastViewport } from '@/components/ui/toast';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0}>
      <ThemeProvider>
        <ToastProvider>
          <CustomToastProvider>
            {children}
            <ToastViewport />
          </CustomToastProvider>
          <Toaster />
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
} 