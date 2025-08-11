import { getBlogBySlug } from '../../../lib/blog'
import { notFound } from 'next/navigation'
import DOMPurify from 'isomorphic-dompurify'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BackNavigationHandler from '@/components/BackNavigationHandler'
import BlogComments from '@/components/BlogComments'
import { formatDistanceToNow } from 'date-fns'
import ShareActions from '@/components/ShareActions'
import { slugify } from '@/lib/utils'

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
                <p className="text-xl text-muted-foreground mb-2">{blog.subtitle}</p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                    <p className="text-sm text-muted-foreground">
                        {(() => {
                            const words = blog.content.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length
                            const minutes = Math.max(1, Math.round(words / 200))
                            return `Published ${formatDistanceToNow(new Date(blog.createdAt), { addSuffix: true })} • ${minutes} min read${blog.updatedAt ? ` • Updated ${formatDistanceToNow(new Date(blog.updatedAt), { addSuffix: true })}` : ''}`
                        })()}
                    </p>
                    <ShareActions url={`${process.env.NEXT_PUBLIC_APP_URL || ''}/blog/${blog.slug}`} title={blog.title} />
                </div>

                {(() => {
                    const sanitized = DOMPurify.sanitize(blog.content)
                    const headingRegex = /<(h2|h3)>([^<]+)<\/\1>/g
                    const matches = Array.from(sanitized.matchAll(headingRegex))
                    const toc = matches.map((m) => ({
                        level: m[1] as 'h2' | 'h3',
                        text: m[2],
                        id: slugify(m[2])
                    }))
                    const htmlWithIds = sanitized
                        .replace(/<h2>([^<]+)<\/h2>/g, (_m, t) => `<h2 id="${slugify(t)}">${t}</h2>`)
                        .replace(/<h3>([^<]+)<\/h3>/g, (_m, t) => `<h3 id="${slugify(t)}">${t}</h3>`)
                    return (
                        <>
                            {toc.length > 0 && (
                                <nav aria-label="Table of contents" className="mb-6 border-l-2 border-primary/20 pl-4">
                                    <p className="text-sm uppercase tracking-wide text-muted-foreground">Contents</p>
                                    <ul className="mt-2 space-y-1">
                                        {toc.map((item, i) => (
                                            <li key={`${item.id}-${i}`} className={item.level === 'h3' ? 'ml-4' : ''}>
                                                <a href={`#${item.id}`} className="text-primary hover:underline">
                                                    {item.text}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </nav>
                            )}
                            <div
                                className="prose dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: htmlWithIds }}
                            />
                        </>
                    )
                })()}
                <BlogComments blogId={blog._id} />
            </article>
            <div className="hidden lg:block w-32 bg-[#263547]" />
        </div>
    )
} 