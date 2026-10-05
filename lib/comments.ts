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

export { moderateComment } from './comment-moderation'
