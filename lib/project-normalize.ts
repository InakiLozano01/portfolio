import { z } from 'zod'
import { slugify } from '@/lib/utils'
import { normalizeProjectThumbnailOptimization } from '@/lib/project-thumbnail-settings'

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid technology id')

const cleanString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const cleanOptionalString = (value: unknown) => {
  const str = cleanString(value)
  return str.length ? str : undefined
}

const cleanUrl = (value: unknown) => {
  const str = cleanString(value)
  if (!str) return undefined
  try {
    const url = new URL(str)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

const cleanPositiveNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined
}

const projectImagePathPattern = /^\/images\/projects\/[A-Za-z0-9._-]+\.(?:avif|jpe?g|png|webp)$/i

const cleanImagePath = (value: unknown) => {
  const str = cleanString(value)
  if (!str) return undefined
  if (projectImagePathPattern.test(str)) return str
  try {
    const url = new URL(str)
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString()
  } catch {
    return undefined
  }
  return undefined
}

export function normalizeProjectPayload(payload: Record<string, unknown>) {
  const title = cleanString(payload.title || payload.title_en)
  const subtitle = cleanString(payload.subtitle || payload.subtitle_en)
  const description = cleanString(payload.description_en || payload.description)

  const technologies = Array.isArray(payload.technologies)
    ? payload.technologies.map((id) => String(id)).filter(Boolean)
    : []

  const parsedTechnologies = z.array(objectId).parse(technologies)
  const slug = cleanString(payload.slug) || slugify(title)

  return {
    title,
    subtitle,
    description,
    slug,
    title_en: cleanOptionalString(payload.title_en) || title,
    title_es: cleanOptionalString(payload.title_es),
    subtitle_en: cleanOptionalString(payload.subtitle_en) || subtitle,
    subtitle_es: cleanOptionalString(payload.subtitle_es),
    description_en: cleanOptionalString(payload.description_en) || description,
    description_es: cleanOptionalString(payload.description_es),
    technologies: parsedTechnologies,
    thumbnail: cleanImagePath(payload.thumbnail),
    thumbnailAlt: cleanOptionalString(payload.thumbnailAlt),
    thumbnailOptimization: normalizeProjectThumbnailOptimization(payload.thumbnailOptimization),
    imageWidth: cleanPositiveNumber(payload.imageWidth),
    imageHeight: cleanPositiveNumber(payload.imageHeight),
    githubUrl: cleanUrl(payload.githubUrl),
    publicUrl: cleanUrl(payload.publicUrl),
    featured: payload.featured === true,
  }
}
