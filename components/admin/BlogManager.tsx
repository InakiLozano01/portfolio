'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Trash2, Edit, FileText, Send } from 'lucide-react'
import { type Blog } from '@/models/BlogClient'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { buildNewsletterEmail } from '@/lib/blog-newsletter'
import type { ISubscriber } from '@/models/Subscriber'

export default function BlogManager() {
    const router = useRouter()
    const { toast } = useToast()
    const [blogs, setBlogs] = useState<Blog[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [subscribers, setSubscribers] = useState<ISubscriber[]>([])
    const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null)
    const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
    const [recipientSearch, setRecipientSearch] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [emailPreview, setEmailPreview] = useState<{ subject: string; html: string; text: string } | null>(null)
    const [newsletterModalOpen, setNewsletterModalOpen] = useState(false)

    const filteredSubscribers = useMemo(() => {
        const term = recipientSearch.trim().toLowerCase()
        if (!term) return subscribers
        return subscribers.filter((sub) => {
            const email = sub.email.toLowerCase()
            const language = (sub.language || '').toLowerCase()
            return email.includes(term) || language.includes(term)
        })
    }, [recipientSearch, subscribers])

    useEffect(() => {
        if (!selectedBlog) {
            setEmailPreview(null)
            return
        }
        if (selectedRecipients.length === 0) {
            setEmailPreview(null)
            return
        }
        const recipients = selectedRecipients
            .map(id => subscribers.find(sub => sub._id?.toString() === id))
            .filter(Boolean) as ISubscriber[]
        if (!recipients.length) {
            setEmailPreview(null)
            return
        }
        const preview = buildNewsletterEmail(selectedBlog, recipients[0])
        setEmailPreview(preview)
    }, [selectedBlog, selectedRecipients, subscribers])

    useEffect(() => {
        fetchBlogs()
        fetchSubscribers()
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

    async function fetchSubscribers() {
        try {
            const response = await fetch('/api/subscribers')
            if (!response.ok) {
                throw new Error('Failed to fetch subscribers')
            }
            const data = await response.json()
            setSubscribers(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Failed to fetch subscribers', err)
        }
    }

    const handleNewPost = () => {
        router.push('/admin/blogs/new')
    }

    const handleEdit = (blog: Blog) => {
        router.push(`/admin/blogs/${blog._id}/edit`)
    }

    const toggleRecipient = (id: string) => {
        setSelectedRecipients(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
    }

    const openNewsletterModal = (blog: Blog) => {
        setSelectedBlog(blog)
        const defaultRecipients = subscribers.filter(sub => !sub.unsubscribed).map(sub => sub._id?.toString() || '')
        setSelectedRecipients(defaultRecipients)
        setEmailPreview(null)
        setNewsletterModalOpen(true)
    }

    const handleSendNewsletter = async () => {
        if (!selectedBlog || selectedRecipients.length === 0) {
            toast({ title: 'Recipients required', description: 'Select at least one subscriber.', variant: 'destructive' })
            return
        }
        setIsSending(true)
        try {
            const response = await fetch(`/api/blogs/${selectedBlog._id}/send-newsletter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriberIds: selectedRecipients })
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to send newsletter')
            }
            toast({ title: 'Newsletter sent', description: `Sent to ${data.sent} subscribers.` })
            setNewsletterModalOpen(false)
        } catch (err) {
            toast({ title: 'Send failed', description: err instanceof Error ? err.message : 'Failed to send newsletter', variant: 'destructive' })
        } finally {
            setIsSending(false)
        }
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
                                .filter((blog) => {
                                    const query = search.trim().toLowerCase();
                                    if (!query) return true;
                                    const haystack = [
                                        blog.title_en,
                                        blog.title_es,
                                        blog.subtitle_en,
                                        blog.subtitle_es,
                                        blog.content_en,
                                        blog.content_es,
                                        blog.title,
                                        blog.subtitle,
                                        blog.content,
                                        ...blog.tags,
                                    ]
                                        .filter(Boolean)
                                        .map((value) => value.toLowerCase());

                                    return haystack.some((value) => value.includes(query));
                                })
                                .map((blog) => {
                                    const isModalOpen = newsletterModalOpen && selectedBlog?._id === blog._id
                                    return (
                                        <Card key={blog._id} className="hover:shadow-md transition-all duration-200 border border-slate-200 hover:border-slate-300">
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-2 flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <h3 className="font-semibold text-slate-900 text-lg">{blog.title_en || blog.title}</h3>
                                                            <Badge
                                                                className={blog.published ?
                                                                    "bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200" :
                                                                    "bg-red-100 text-red-800 border border-red-200 hover:bg-red-200"
                                                                }
                                                            >
                                                                {blog.published ? 'Published' : 'Draft'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-slate-600">{blog.subtitle_en || blog.subtitle}</p>
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
                                                        <Dialog open={isModalOpen} onOpenChange={(open) => {
                                                            if (!open) setNewsletterModalOpen(false)
                                                        }}>
                                                            <DialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                    onClick={() => openNewsletterModal(blog)}
                                                                >
                                                                    <Send className="w-4 h-4" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-5xl">
                                                                <DialogHeader className="space-y-2">
                                                                    <DialogTitle>Send blog to subscribers</DialogTitle>
                                                                    <DialogDescription>
                                                                        Choose recipients, review the preview, and send a formatted newsletter email for <span className="font-semibold text-primary">{blog.title_en || blog.title}</span>.
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <div className="grid lg:grid-cols-[minmax(260px,1fr)_minmax(320px,1.25fr)] gap-6">
                                                                    <div className="rounded-xl border bg-slate-50 p-4 shadow-sm">
                                                                        <div className="flex items-center justify-between gap-2 border-b pb-3">
                                                                            <div className="space-y-1">
                                                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recipients</p>
                                                                                <p className="text-xs text-slate-500">Select at least one active subscriber.</p>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={() => {
                                                                                        const allActive = subscribers.filter(sub => !sub.unsubscribed).map(sub => sub._id?.toString() || '')
                                                                                        setSelectedRecipients(allActive)
                                                                                    }}
                                                                                >
                                                                                    Select all
                                                                                </Button>
                                                                                <button
                                                                                    className="text-xs text-primary hover:underline"
                                                                                    onClick={() => {
                                                                                        setSelectedRecipients([])
                                                                                    }}
                                                                                >
                                                                                    Clear
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                        <Input
                                                                            value={recipientSearch}
                                                                            onChange={(e) => setRecipientSearch(e.target.value)}
                                                                            placeholder="Search by email or language..."
                                                                            className="mt-4 mb-3 h-9"
                                                                        />
                                                                        <ScrollArea className="h-64 rounded-lg border bg-white">
                                                                            <div className="divide-y">
                                                                                {filteredSubscribers.map((sub) => {
                                                                                    const id = sub._id?.toString() || ''
                                                                                    if (!id) return null
                                                                                    const checked = selectedRecipients.includes(id)
                                                                                    return (
                                                                                        <label
                                                                                            key={id}
                                                                                            className={`flex items-start gap-3 p-3 text-sm transition ${checked ? 'bg-green-50' : 'hover:bg-slate-50'}`}
                                                                                        >
                                                                                            <Checkbox
                                                                                                checked={checked}
                                                                                                onCheckedChange={() => toggleRecipient(id)}
                                                                                                className="mt-0.5"
                                                                                            />
                                                                                            <div className="space-y-1">
                                                                                                <p className="font-medium text-slate-800">{sub.email}</p>
                                                                                                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                                                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5">{(sub.language || 'en').toUpperCase()}</span>
                                                                                                    <span className={sub.unsubscribed ? 'text-red-500' : 'text-green-600'}>
                                                                                                        {sub.unsubscribed ? 'Unsubscribed' : 'Active'}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </label>
                                                                                    )
                                                                                })}
                                                                                {filteredSubscribers.length === 0 && (
                                                                                    <p className="px-3 py-6 text-center text-sm text-slate-500">No subscribers match your search.</p>
                                                                                )}
                                                                            </div>
                                                                        </ScrollArea>
                                                                    </div>
                                                                    <div className="space-y-5">
                                                                        <div className="rounded-xl border bg-white p-4 shadow-sm">
                                                                            <div className="flex items-center justify-between border-b pb-3">
                                                                                <div>
                                                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
                                                                                    <p className="text-xs text-slate-500">Shows how the first recipient will see the email.</p>
                                                                                </div>
                                                                                <span className="text-xs text-slate-400">{selectedRecipients.length} selected</span>
                                                                            </div>
                                                                            {emailPreview ? (
                                                                                <div className="mt-3 border rounded-lg overflow-hidden">
                                                                                    <div className="bg-slate-900 text-white px-4 py-2">
                                                                                        <p className="text-[11px] uppercase tracking-wide opacity-80">Subject</p>
                                                                                        <p className="text-sm font-semibold">{emailPreview.subject}</p>
                                                                                    </div>
                                                                                    <div className="h-64 overflow-y-auto bg-slate-50 p-4 text-sm" dangerouslySetInnerHTML={{ __html: emailPreview.html }} />
                                                                                </div>
                                                                            ) : (
                                                                                <div className="mt-6 flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                                                                                    Select at least one active subscriber to generate a preview.
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="rounded-xl border bg-white p-4 shadow-sm">
                                                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plain text fallback</p>
                                                                            <Textarea
                                                                                value={emailPreview?.text || ''}
                                                                                readOnly
                                                                                className="mt-2 min-h-[120px] resize-none bg-slate-50"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <DialogFooter className="gap-2">
                                                                    <Button variant="outline" onClick={() => setNewsletterModalOpen(false)}>Cancel</Button>
                                                                    <Button onClick={handleSendNewsletter} disabled={isSending || selectedRecipients.length === 0}>
                                                                        {isSending ? 'Sending...' : `Send to ${selectedRecipients.length} recipient${selectedRecipients.length === 1 ? '' : 's'}`}
                                                                    </Button>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
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
                                    )
                                })
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
} 
