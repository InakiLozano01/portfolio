"use client"

import { useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

type Props = {
  createdAt: string | Date
  updatedAt?: string | Date | null
  lang?: 'en' | 'es'
  dict?: any
}

export function PublishedInfo({ createdAt, updatedAt, lang = 'en', dict = {} }: Props) {
  const label = useMemo(() => {
    const created = new Date(createdAt)
    const updated = updatedAt ? new Date(updatedAt) : null
    const locale = lang === 'es' ? es : undefined

    const parts: string[] = []
    if (!isNaN(created.getTime())) {
      parts.push(`${dict?.published || 'Published'} ${formatDistanceToNow(created, { addSuffix: true, locale })}`)
    }
    if (updated && !isNaN(updated.getTime())) {
      parts.push(`${dict?.updated || 'Updated'} ${formatDistanceToNow(updated, { addSuffix: true, locale })}`)
    }

    return parts.join(" • ")
  }, [createdAt, updatedAt, lang, dict?.published, dict?.updated])

  if (!label) return null

  return (
    <p className="text-sm text-muted-foreground" suppressHydrationWarning>
      {label}
    </p>
  )
}
