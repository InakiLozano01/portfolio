import { connectToDatabase } from '@/lib/mongodb'
import Blog from '@/models/Blog'
import { cache } from 'react'

export const getBlogBySlug = cache(async (slug: string) => {
    await connectToDatabase()

    const blog = await Blog.findOne({ slug })
        .lean()
        .exec()

    if (!blog) return null

    return {
        ...blog,
        _id: blog._id.toString(),
        createdAt: blog.createdAt.toISOString(),
        updatedAt: blog.updatedAt.toISOString()
    }
}) 