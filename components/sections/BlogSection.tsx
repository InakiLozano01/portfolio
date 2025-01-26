'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search } from 'lucide-react'
import { type Blog } from '@/models/BlogClient'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { formatDate } from '@/lib/utils'

export default function BlogSection() {
    const router = useRouter();
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
                const publishedBlogs = data.filter((blog: Blog) => blog.published);
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
        const filtered = blogs.filter((blog) =>
            blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            blog.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
            blog.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            blog.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        setFilteredBlogs(filtered);
    }, [searchQuery, blogs]);

    const handleBlogClick = (blog: Blog) => {
        router.push(`/blog/${blog.slug}`);
    };

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
            </div>
            {filteredBlogs.length === 0 ? (
                <div className="text-center text-muted-foreground">
                    No blogs found matching your search.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBlogs.map((blog) => (
                        <Card
                            key={blog._id}
                            className="cursor-pointer hover:shadow-lg transition-shadow duration-200 overflow-hidden group"
                            onClick={() => handleBlogClick(blog)}
                        >
                            <CardHeader className="relative">
                                <CardTitle className="text-xl mb-2 bg-gradient-to-r from-primary to-red-500 bg-clip-text text-transparent">
                                    {blog.title}
                                </CardTitle>
                                <p className="text-muted-foreground text-sm">
                                    {blog.subtitle}
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {blog.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>Created {formatDistanceToNow(formatDate(blog.createdAt), { addSuffix: true })}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
} 