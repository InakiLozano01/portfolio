'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Trash2, Edit } from 'lucide-react'
import { type Blog } from '@/models/BlogClient'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'

export default function BlogManager() {
    const router = useRouter()
    const { toast } = useToast()
    const [blogs, setBlogs] = useState<Blog[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchBlogs()
    }, [])

    async function fetchBlogs() {
        try {
            const response = await fetch('/api/blogs')
            if (!response.ok) {
                throw new Error('Failed to fetch blogs')
            }
            const data = await response.json()
            setBlogs(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleNewPost = () => {
        router.push('/admin/blogs/new')
    }

    const handleEdit = (blog: Blog) => {
        router.push(`/admin/blogs/${blog._id}/edit`)
    }

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/blogs/${id}`, {
                method: 'DELETE',
            })

            if (!response.ok) throw new Error('Failed to delete blog post')

            await fetchBlogs()
            toast({
                title: 'Success',
                description: 'Blog post deleted successfully',
            })
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete blog post',
                variant: 'destructive',
            })
        }
    }

    if (loading) {
        return <div className="text-center">Loading blogs...</div>
    }

    if (error) {
        return <div className="text-center text-red-500">Error: {error}</div>
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Blog Posts</h2>
                <Button
                    onClick={handleNewPost}
                    className="bg-green-500 hover:bg-green-600 text-white"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Blog Post
                </Button>
            </div>

            <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
                <div className="space-y-4">
                    {blogs.map((blog) => (
                        <Card key={blog._id} className="hover:bg-gray-50 transition-colors">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium">{blog.title}</h3>
                                            <Badge
                                                className={blog.published ?
                                                    "bg-green-500 hover:bg-green-600 text-white" :
                                                    "bg-red-500 hover:bg-red-600 text-white"
                                                }
                                            >
                                                {blog.published ? 'Published' : 'Draft'}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-500">{blog.subtitle}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                            onClick={() => handleEdit(blog)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => {
                                                if (blog._id) {
                                                    handleDelete(blog._id);
                                                } else {
                                                    toast({
                                                        title: "Error",
                                                        description: "Blog ID is missing",
                                                        variant: "destructive",
                                                    });
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
} 