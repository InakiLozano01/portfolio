'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
// Removed unused imports
import { type Blog } from '@/models/BlogClient'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { formatDate } from '@/lib/utils'
import NewsletterSignup from '@/components/NewsletterSignup'

export default function BlogSection() {
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchBlogs() {
            try {
                const response = await fetch('/api/blogs');
                if (!response.ok) {
                    throw new Error('Failed to fetch blogs');
                }
                const data = await response.json();
                const publishedBlogs = data
                    .filter((blog: Blog) => blog.published)
                    .map((blog: Blog) => ({
                        ...blog,
                        title_en: blog.title_en || blog.title,
                        title_es: blog.title_es || blog.title,
                        subtitle_en: blog.subtitle_en || blog.subtitle,
                        subtitle_es: blog.subtitle_es || blog.subtitle,
                        content_en: blog.content_en || blog.content,
                        content_es: blog.content_es || blog.content,
                    }));
                setBlogs(publishedBlogs);
                setFilteredBlogs(publishedBlogs);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        }

        fetchBlogs();
    }, []);

    useEffect(() => {
        const query = searchQuery.trim().toLowerCase();
        const filtered = blogs.filter((blog) => {
            if (!query) return true;
            const haystack = [
                blog.title_en,
                blog.title_es,
                blog.subtitle_en,
                blog.subtitle_es,
                blog.content_en,
                blog.content_es,
                ...blog.tags,
            ]
                .filter(Boolean)
                .map((value) => value.toLowerCase());

            return haystack.some((value) => value.includes(query));
        });
        setFilteredBlogs(filtered);
    }, [searchQuery, blogs]);

    const highlight = (text?: string) => {
        const fallback = text ?? ''
        const q = searchQuery.trim()
        if (!q) return fallback
        const regex = new RegExp(`(${q.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'ig')
        return fallback.split(regex).map((part, i) =>
            regex.test(part) ? (
                <mark key={i} className="bg-yellow-200 text-black rounded px-0.5">{part}</mark>
            ) : (
                <span key={i}>{part}</span>
            )
        )
    }

    // Using Link for prefetch and accessibility

    if (loading) {
        return (
            <div className="container mx-auto py-8 px-4">
                <div className="mb-8">
                    <Input
                        type="text"
                        placeholder="Search blogs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-md mx-auto bg-white text-black placeholder:text-gray-500"
                        disabled
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader>
                                <div className="h-8 bg-primary/10 rounded mb-4" />
                                <div className="h-4 bg-primary/10 rounded w-3/4" />
                            </CardHeader>
                            <CardContent>
                                <div className="h-4 bg-primary/10 rounded mb-2" />
                                <div className="h-4 bg-primary/10 rounded w-2/3" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto py-8 px-4 text-center text-red-500">
                Error: {error}
            </div>
        );
    }

    if (blogs.length === 0) {
        return (
            <div className="container mx-auto py-8 px-4 text-center">
                <h2 className="text-3xl font-bold mb-4">Coming Soon! 🚀</h2>
                <p className="text-muted-foreground">
                    We're preparing some exciting content for you. Stay tuned!
                </p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <Input
                    type="text"
                    placeholder="Search blogs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md mx-auto bg-white text-black placeholder:text-gray-500"
                />
                <div className="mt-4 max-w-2xl mx-auto">
                    <NewsletterSignup />
                </div>
            </div>
            {filteredBlogs.length === 0 ? (
                <div className="text-center text-muted-foreground">
                    No blogs found matching your search.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBlogs.map((blog) => (
                        <Link key={blog._id} href={`/blog/${blog.slug}`} prefetch={true} className="block">
                            <Card className="hover:shadow-lg hover:bg-primary/5 transition-shadow duration-200 overflow-hidden group">
                                <CardHeader className="relative space-y-2">
                                    <CardTitle className="text-xl bg-gradient-to-r from-primary to-red-500 bg-clip-text text-transparent">
                                        {highlight(blog.title_en)}
                                    </CardTitle>
                                    <p className="text-muted-foreground text-sm">
                                        {highlight(blog.subtitle_en)}
                                    </p>
                                    <div className="text-muted-foreground text-xs italic space-y-1">
                                        <p>{highlight(blog.title_es)}</p>
                                        <p>{highlight(blog.subtitle_es)}</p>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {blog.tags.map((tag) => (
                                            <button
                                                key={tag}
                                                className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs hover:bg-primary/20"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    setSearchQuery(tag)
                                                }}
                                                aria-label={`Filter by tag ${tag}`}
                                            >
                                                {highlight(tag)}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span>Created {formatDistanceToNow(formatDate(blog.createdAt), { addSuffix: true })}</span>
                                        <span className="uppercase text-xs tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">EN / ES</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
} 
