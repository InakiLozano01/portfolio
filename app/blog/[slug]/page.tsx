'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { type Blog } from '@/models/BlogClient';
import { formatDistanceToNow } from 'date-fns';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface BlogPageProps {
    params: {
        slug: string;
    };
}

function LoadingState() {
    return (
        <div className="flex">
            <div className="hidden lg:block w-32 bg-[#263547]" />
            <article className="container max-w-4xl mx-auto py-8 px-4 flex-1">
                <div className="mb-8">
                    <Skeleton className="h-10 w-20" />
                </div>

                <div className="mb-8 text-center space-y-4">
                    <Skeleton className="h-8 w-3/4 mx-auto" />
                    <Skeleton className="h-6 w-2/3 mx-auto" />
                    <div className="flex gap-2 justify-center">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                    </div>
                </div>

                <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            </article>
            <div className="hidden lg:block w-32 bg-[#263547]" />
        </div>
    );
}

export default function BlogPage({ params }: BlogPageProps) {
    const router = useRouter();
    const [blog, setBlog] = useState<Blog | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchBlog() {
            try {
                const response = await fetch(`/api/blogs/slug/${params.slug}`);
                if (!response.ok) {
                    if (response.status === 404) {
                        router.push('/not-found');
                        return;
                    }
                    throw new Error('Failed to fetch blog');
                }
                const data = await response.json();
                setBlog(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        }

        fetchBlog();
    }, [params.slug, router]);

    if (loading) {
        return <LoadingState />;
    }

    if (error || !blog) {
        return (
            <div className="flex">
                <div className="hidden lg:block w-32 bg-[#263547]" />
                <div className="container max-w-4xl mx-auto py-8 px-4 flex-1 text-red-500">Error: {error}</div>
                <div className="hidden lg:block w-32 bg-[#263547]" />
            </div>
        );
    }

    return (
        <div className="flex">
            <div className="hidden lg:block w-32 bg-[#263547]" />
            <article className="container max-w-4xl mx-auto py-8 px-4 flex-1">
                <Button
                    variant="ghost"
                    className="mb-8 hover:bg-primary/10 hover:text-primary"
                    onClick={() => {
                        router.push('/#blog');
                        router.refresh();
                    }}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                <header className="mb-8 text-center border-b border-[#263547]/20 pb-8">
                    <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-red-500 bg-clip-text text-transparent">
                        {blog.title}
                    </h1>
                    <p className="text-xl text-muted-foreground mb-4">{blog.subtitle}</p>
                    {blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-center">
                            {blog.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </header>

                <div
                    className="prose dark:prose-invert max-w-none mb-8 border-b border-[#263547]/20 pb-8"
                    dangerouslySetInnerHTML={{ __html: blog.content }}
                />

                {blog.footer && (
                    <footer className="mt-8 pt-4 border-t border-[#263547]/20 mb-8 pb-8 border-b">
                        <p className="text-muted-foreground">{blog.footer}</p>
                    </footer>
                )}

                {blog.bibliography && (
                    <div className="mt-8 pt-4 border-t border-[#263547]/20 mb-8 pb-8 border-b">
                        <h2 className="text-2xl font-bold mb-4">Bibliography</h2>
                        <div className="prose dark:prose-invert max-w-none">
                            <pre>{blog.bibliography}</pre>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4">
                    <span>Created {formatDistanceToNow(formatDate(blog.createdAt), { addSuffix: true })}</span>
                    <span>•</span>
                    <span>Updated {formatDistanceToNow(formatDate(blog.updatedAt), { addSuffix: true })}</span>
                </div>
            </article>
            <div className="hidden lg:block w-32 bg-[#263547]" />
        </div>
    );
} 