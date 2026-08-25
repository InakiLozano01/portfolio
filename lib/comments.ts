const HEX_24 = /^[a-fA-F0-9]{24}$/

export const ALLOWED_COMMENT_STATUS = ['approved', 'rejected', 'pending'] as const
export type CommentStatus = (typeof ALLOWED_COMMENT_STATUS)[number]

export function isValidObjectId(id: unknown): id is string {
  return typeof id === 'string' && HEX_24.test(id)
}

/** Strip angle brackets and clamp length — shared by public and admin comment writes. */
export function sanitizeCommentText(value: unknown, max = 5000): string {
  return String(value ?? '')
    .slice(0, max)
    .replace(/[<>]/g, '')
}

export function sanitizeAlias(value: unknown): string {
  return sanitizeCommentText(value, 40)
}

export async function moderateComment(content: string): Promise<boolean> {
  // Basic local moderation fallback
  const banned = [
    /\b(?:kill|suicide|rape|nazi|terror|slur|retard|faggot)\b/i,
    /(https?:\/\/\S{40,})/i,
    /(.)\1{10,}/,
  ]
  for (const rx of banned) {
    if (rx.test(content)) return false
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) return true

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:moderateText?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: content }] }] })
      })
    const data = await res.json()
    if (data?.blocked === true) return false
  } catch (err) {
    console.error('Moderation error', err)
  }
  return true
}
