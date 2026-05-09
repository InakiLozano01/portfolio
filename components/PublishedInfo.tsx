"use client"

import { useMemo } from "react"
import { formatDistanceToNow } from "date-fns"

type Props = {
  createdAt: string | Date
  updatedAt?: string | Date | null
}

export function PublishedInfo({ createdAt, updatedAt }: Props) {
  const label = useMemo(() => {
    const created = new Date(createdAt)
    const updated = updatedAt ? new Date(updatedAt) : null

    const parts: string[] = []
    if (!isNaN(created.getTime())) {
      parts.push(`Published ${formatDistanceToNow(created, { addSuffix: true })}`)
    }
    if (updated && !isNaN(updated.getTime())) {
      parts.push(`Updated ${formatDistanceToNow(updated, { addSuffix: true })}`)
    }

    return parts.join(" • ")
  }, [createdAt, updatedAt])

  if (!label) return null

  return (
    <p className="text-sm text-muted-foreground" suppressHydrationWarning>
      {label}
    </p>
  )
}
