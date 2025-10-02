import { getBlogBySlug } from '../../../lib/blog'
import { notFound } from 'next/navigation'
// content rendering moved to client component
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BackNavigationHandler from '@/components/BackNavigationHandler'
import BlogComments from '@/components/BlogComments'
import { formatDistanceToNow } from 'date-fns'
import ShareActions from '@/components/ShareActions'
import BlogArticle from '@/components/BlogArticle'
import NewsletterSignup from '@/components/NewsletterSignup'

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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''

    return (
        <div className="flex min-h-screen bg-[#263547]">
            <BackNavigationHandler />

            <div className="hidden lg:block w-16 xl:w-24 bg-[#263547]" aria-hidden="true" />

            <div className="relative flex-1 overflow-x-hidden overflow-y-auto bg-white">
                <div className="pointer-events-none absolute inset-0 -z-10">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="blog-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E5E5" strokeWidth="1.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#blog-grid)" />
                    </svg>
                </div>

                <article className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-6"
                    >
                        <ArrowLeft size={20} />
                        Back to Home
                    </Link>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-8">
                        <p className="text-sm text-muted-foreground">
                            {`Published ${formatDistanceToNow(new Date(blog.createdAt), { addSuffix: true })}${blog.updatedAt ? ` • Updated ${formatDistanceToNow(new Date(blog.updatedAt), { addSuffix: true })}` : ''}`}
                        </p>
                        <ShareActions url={`${baseUrl}/blog/${blog.slug}`} title={blog.title} />
                    </div>

                    <BlogArticle blog={blog as any} />

                    <div className="my-10">
                        <NewsletterSignup compact />
                    </div>

                    <BlogComments blogId={blog._id} />
                </article>
            </div>

            <div className="hidden lg:block w-16 xl:w-24 bg-[#263547]" aria-hidden="true" />
        </div>
    )
}
