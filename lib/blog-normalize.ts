import { slugify } from '@/lib/utils'

const stringOrEmpty = (value: unknown) =>
  typeof value === 'string' ? value : ''

const normalizeHtml = (value: unknown) =>
  typeof value === 'string' ? value : ''

const normalizeOptional = (value: unknown) => {
  if (value == null) return undefined
  const str = String(value)
  return str.length ? str : undefined
}

export type BlogPayload = Record<string, unknown>

export function normalizeBlogPayload(payload: BlogPayload) {
  const titleEn = stringOrEmpty(payload.title_en).trim() || stringOrEmpty(payload.title).trim()
  const titleEs = stringOrEmpty(payload.title_es).trim() || titleEn
  const subtitleEn = stringOrEmpty(payload.subtitle_en).trim() || stringOrEmpty(payload.subtitle).trim()
  const subtitleEs = stringOrEmpty(payload.subtitle_es).trim() || subtitleEn
  const contentEn = normalizeHtml(payload.content_en) || normalizeHtml(payload.content)
  const contentEs = normalizeHtml(payload.content_es) || contentEn
  const footerEn = stringOrEmpty(payload.footer_en).trim()
  const footerEs = stringOrEmpty(payload.footer_es).trim() || footerEn
  const bibliographyEn = stringOrEmpty(payload.bibliography_en).trim()
  const bibliographyEs = stringOrEmpty(payload.bibliography_es).trim() || bibliographyEn

  const tags = Array.isArray(payload.tags)
    ? payload.tags
        .map((tag) => String(tag).trim())
        .filter(Boolean)
    : typeof payload.tags === 'string'
    ? payload.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    : []

  const slug = stringOrEmpty(payload.slug).trim() || slugify(titleEn || titleEs)

  return {
    ...payload,
    title_en: titleEn,
    title_es: titleEs,
    subtitle_en: subtitleEn,
    subtitle_es: subtitleEs,
    content_en: contentEn,
    content_es: contentEs,
    footer_en: normalizeOptional(footerEn),
    footer_es: normalizeOptional(stringOrEmpty(payload.footer_es).trim() || footerEs),
    bibliography_en: normalizeOptional(bibliographyEn),
    bibliography_es: normalizeOptional(stringOrEmpty(payload.bibliography_es).trim() || bibliographyEs),
    // Legacy fields kept in sync with English versions
    title: titleEn || titleEs,
    subtitle: subtitleEn || subtitleEs,
    content: contentEn || contentEs,
    footer: normalizeOptional(stringOrEmpty(payload.footer).trim() || footerEn || footerEs),
    bibliography: normalizeOptional(stringOrEmpty(payload.bibliography).trim() || bibliographyEn || bibliographyEs),
    slug,
    tags,
  }
}
