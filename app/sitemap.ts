import type { MetadataRoute } from 'next'
import { getAllBlogs } from '@/lib/blog'
import { getAllProjects } from '@/lib/projects'

export const dynamic = 'force-dynamic'

const normalizeBaseUrl = (value: string | undefined) => {
  const fallback = 'https://inakilozano.com'
  const raw = (value || fallback).trim()
  const withProtocol = raw.startsWith('http') ? raw : `https://${raw}`
  try {
    const url = new URL(withProtocol)
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return fallback
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL)
  const now = new Date()

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/en`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/es`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
  ]

  if (process.env.SKIP_DB_DURING_BUILD === 'true') {
    return entries
  }

  try {
    const [blogs, projects] = await Promise.all([getAllBlogs(), getAllProjects()])

    for (const blog of blogs) {
      for (const lang of ['en', 'es'] as const) {
        entries.push({
          url: `${baseUrl}/${lang}/blog/${blog.slug}`,
          lastModified: blog.lastModified,
          changeFrequency: 'weekly',
          priority: 0.7,
        })
      }
    }

    for (const project of projects) {
      for (const lang of ['en', 'es'] as const) {
        entries.push({
          url: `${baseUrl}/${lang}/projects/${project.slug}`,
          lastModified: project.lastModified,
          changeFrequency: 'monthly',
          priority: 0.6,
        })
      }
    }
  } catch (error) {
    console.error('Failed to build dynamic sitemap', error)
  }

  return entries
}
