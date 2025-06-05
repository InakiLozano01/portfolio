import { getBlogBySlug } from '../../../lib/blog'
import { notFound } from 'next/navigation'
import DOMPurify from 'isomorphic-dompurify'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BackNavigationHandler from '@/components/BackNavigationHandler'
import BlogComments from '@/components/BlogComments'

interface BlogPageProps {
    params: {
        slug: string
    }
}

export default async function BlogPage({ params }: BlogPageProps) {
    const blog = await getBlogBySlug(params.slug)

    if (!blog) {
        notFound()
    }

    return (
        <div className="min-h-screen flex">
            <BackNavigationHandler />
            <div className="hidden lg:block w-32 bg-[#263547]" />
            <article className="container max-w-4xl mx-auto py-8 px-4 flex-1">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-6"
                >
                    <ArrowLeft size={20} />
                    Back to Home
                </Link>

                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-red-500 bg-clip-text text-transparent">
                    {blog.title}
                </h1>
                <p className="text-xl text-muted-foreground mb-6">{blog.subtitle}</p>

                <div
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(blog.content)
                    }}
                />
                <BlogComments blogId={blog._id} />
            </article>
            <div className="hidden lg:block w-32 bg-[#263547]" />
        </div>
    )
} 