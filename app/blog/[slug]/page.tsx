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

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                    <p className="text-sm text-muted-foreground">
                        {`Published ${formatDistanceToNow(new Date(blog.createdAt), { addSuffix: true })}${blog.updatedAt ? ` • Updated ${formatDistanceToNow(new Date(blog.updatedAt), { addSuffix: true })}` : ''}`}
                    </p>
                    <ShareActions url={`${process.env.NEXT_PUBLIC_APP_URL || ''}/blog/${blog.slug}`} title={blog.title} />
                </div>

                <BlogArticle blog={blog as any} />
                <div className="my-8">
                    <NewsletterSignup compact />
                </div>
                <BlogComments blogId={blog._id} />
            </article>
            <div className="hidden lg:block w-32 bg-[#263547]" />
        </div>
    )
} 
