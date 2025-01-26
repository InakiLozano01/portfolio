'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus } from 'lucide-react'
import { type Blog } from '@/models/BlogClient'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function BlogManager() {
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchBlogs();
    }, []);

    async function fetchBlogs() {
        try {
            const response = await fetch('/api/blogs');
            if (!response.ok) {
                throw new Error('Failed to fetch blogs');
            }
            const data = await response.json();
            setBlogs(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="text-center">Loading blogs...</div>;
    }

    if (error) {
        return <div className="text-center text-red-500">Error: {error}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Blogs</h2>
                <Button asChild>
                    <Link href="/admin/blogs/new">
                        <Plus className="w-4 h-4 mr-2" />
                        New Blog
                    </Link>
                </Button>
            </div>

            <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
                <div className="space-y-4">
                    {blogs.map((blog) => (
                        <Link key={blog._id} href={`/admin/blogs/${blog._id}/edit`}>
                            <Card className="cursor-pointer hover:bg-accent/50">
                                <CardHeader>
                                    <CardTitle>{blog.title}</CardTitle>
                                    <CardDescription>{blog.subtitle}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={blog.published ? "default" : "secondary"}>
                                            {blog.published ? "Published" : "Draft"}
                                        </Badge>
                                        {blog.tags.map((tag) => (
                                            <Badge key={tag} variant="outline">{tag}</Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
} 