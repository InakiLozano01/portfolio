import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
}

const locales = ['en', 'es'] as const

async function pickLocale() {
  const cookieStore = await cookies()
  const headerStore = await headers()

  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value
  if (cookieLocale && locales.includes(cookieLocale as any)) return cookieLocale

  const acceptLanguage = headerStore.get('accept-language')
  if (acceptLanguage) {
    const preferred = acceptLanguage.split(',')[0]?.split('-')[0]
    if (preferred && locales.includes(preferred as any)) return preferred
  }

  return 'en'
}

export default async function BlogPage() {
  redirect(`/${await pickLocale()}#blog`)
}
