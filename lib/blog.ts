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