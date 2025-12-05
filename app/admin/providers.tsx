'use client';

import { useEffect, useRef } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ToastProvider as CustomToastProvider } from '@/components/ui/use-toast';
import { ToastProvider, ToastViewport } from '@/components/ui/toast';
import { CustomToaster } from '@/components/ui/custom-toaster';
import { Toaster } from '@/components/ui/sonner';

export function AdminProviders({ children }: { children: React.ReactNode }) {
  const previousTheme = useRef<string | null>(null);
  const previousColorScheme = useRef<string>('');
  const previousClassName = useRef<string>('');

  useEffect(() => {
    const root = document.documentElement;

    previousClassName.current = root.className;
    previousColorScheme.current = root.style.colorScheme;

    try {
      previousTheme.current = localStorage.getItem('theme');
    } catch {
      previousTheme.current = null;
    }

    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';

    try {
      localStorage.setItem('theme', 'light');
    } catch {
      // ignore
    }

    return () => {
      root.className = previousClassName.current;
      root.style.colorScheme = previousColorScheme.current;
      if (previousTheme.current !== null) {
        try {
          localStorage.setItem('theme', previousTheme.current);
        } catch {
          // ignore
        }
      } else {
        try {
          localStorage.removeItem('theme');
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <SessionProvider refetchInterval={0}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        <ToastProvider>
          <CustomToastProvider>
            {children}
            <ToastViewport />
            <CustomToaster />
          </CustomToastProvider>
          <Toaster />
        </ToastProvider>
      </NextThemesProvider>
    </SessionProvider>
  );
}
