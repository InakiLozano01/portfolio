import type { MetadataRoute } from 'next'
import { getAllBlogs } from '@/lib/blog'
import { getAllProjects } from '@/lib/projects'
import { resolveBaseUrl } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await resolveBaseUrl()
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
