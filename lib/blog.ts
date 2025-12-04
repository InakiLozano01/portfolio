import { cache } from 'react'
import { connectToDatabase } from '@/lib/mongodb'
import Blog from '@/models/Blog'
import { slugify } from '@/lib/utils'

export const getBlogBySlug = async (slug: string) => {
    await connectToDatabase()

    const normalizedSlug = slug?.toString().trim().toLowerCase()

    let blog = await Blog.findOne({ slug: normalizedSlug })
        .lean()
        .exec()

    if (!blog && normalizedSlug) {
        const candidates = await Blog.find({
            $or: [
                { slug: { $regex: `^${normalizedSlug}$`, $options: 'i' } },
                { title: { $exists: true } },
                { title_en: { $exists: true } },
                { title_es: { $exists: true } },
            ],
        }).lean().exec()

        blog = candidates.find((b: any) => {
            const slugs = [
                b.slug,
                slugify(b.title || ''),
                slugify(b.title_en || ''),
                slugify(b.title_es || ''),
            ]
                .filter(Boolean)
                .map((s: string) => s.toLowerCase())
            return slugs.includes(normalizedSlug)
        }) || null
    }

    if (!blog) return null

    return {
        ...blog,
        _id: blog._id.toString(),
        createdAt: blog.createdAt.toISOString(),
        updatedAt: blog.updatedAt.toISOString()
    }
}

export const getAllBlogs = cache(async () => {
    await connectToDatabase()

    const blogs = await Blog.find({ published: true })
        .select('slug updatedAt')
        .lean()
        .exec()

    return blogs.map(blog => ({
        slug: blog.slug,
        lastModified: blog.updatedAt
    }))
}) 
