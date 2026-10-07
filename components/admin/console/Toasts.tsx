'use client'

import { Toaster } from 'sonner'

/** One toast system for the console: navy slips, bottom right, for transient confirmations only. */
export function Toasts() {
  return (
    <Toaster
      position="bottom-right"
      offset={20}
      gap={8}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'flex w-[min(380px,calc(100vw-32px))] items-start gap-3 rounded-2xl bg-navy px-4 py-3.5 text-[14px] text-cream',
          title: 'font-medium',
          description: 'mt-0.5 text-[13px] text-[#c3c9d3]',
          icon: 'mt-0.5 text-coral',
          actionButton: 'ml-auto rounded-full bg-cream px-3 py-1 text-[13px] font-medium text-navy',
          error: 'bg-bordeaux',
        },
      }}
    />
  )
}
