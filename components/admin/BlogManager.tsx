'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Trash2, Edit, FileText } from 'lucide-react'
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
    const [search, setSearch] = useState('')

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
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-slate-200 rounded w-48"></div>
                    <div className="h-4 bg-slate-200 rounded w-32"></div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
                <div className="text-red-600 font-semibold">Error loading blogs</div>
                <div className="text-red-500 text-sm mt-1">{error}</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center p-6 bg-white rounded-lg shadow-md border-l-4 border-red-600">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Blog Posts</h2>
                    <p className="text-slate-600 text-sm mt-1">Create and manage your blog articles</p>
                </div>
                <Button
                    onClick={handleNewPost}
                    className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Blog Post
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <ScrollArea className="h-[calc(100vh-16rem)]">
                    <div className="p-4 space-y-3">
                        <div className="mb-2">
                            <input
                                className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
                                placeholder="Search blog posts..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        {blogs.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                                <p className="text-slate-500 text-lg">No blog posts yet</p>
                                <p className="text-slate-400 text-sm">Create your first blog post to get started</p>
                            </div>
                        ) : (
                            blogs
                                .filter((b) => (b.title || '').toLowerCase().includes(search.toLowerCase()) || (b.subtitle || '').toLowerCase().includes(search.toLowerCase()))
                                .map((blog) => (
                                    <Card key={blog._id} className="hover:shadow-md transition-all duration-200 border border-slate-200 hover:border-slate-300">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-2 flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="font-semibold text-slate-900 text-lg">{blog.title}</h3>
                                                        <Badge
                                                            className={blog.published ?
                                                                "bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200" :
                                                                "bg-red-100 text-red-800 border border-red-200 hover:bg-red-200"
                                                            }
                                                        >
                                                            {blog.published ? 'Published' : 'Draft'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-slate-600">{blog.subtitle}</p>
                                                </div>
                                                <div className="flex gap-2 ml-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={() => handleEdit(blog)}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => {
                                                            if (blog._id) {
                                                                if (confirm('Are you sure you want to delete this blog post?')) {
                                                                    handleDelete(blog._id);
                                                                }
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
                                ))
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
} 