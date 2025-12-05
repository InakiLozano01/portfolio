'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Edit, FileText, Send, Search, Eye, ArrowRight, Save, Globe, X } from 'lucide-react'
import { Blog } from '@/models/BlogClient'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { TinyMCE } from '@/components/ui/tinymce'
import { buildNewsletterEmail } from '@/lib/blog-newsletter'
import type { ISubscriber } from '@/models/Subscriber'
import { slugify } from '@/lib/utils'
import { ZodError } from 'zod'

const requiredField = (value: string) => value.trim();

export default function BlogManager() {
    const { toast } = useToast()
    const [blogs, setBlogs] = useState<Blog[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    
    // Newsletter state
    const [subscribers, setSubscribers] = useState<ISubscriber[]>([])
    const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
    const [recipientSearch, setRecipientSearch] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [emailPreview, setEmailPreview] = useState<{ subject: string; html: string; text: string } | null>(null)
    const [newsletterModalOpen, setNewsletterModalOpen] = useState(false)
    const [newsletterBlog, setNewsletterBlog] = useState<Blog | null>(null)

    // Editor state
    const [selectedBlog, setSelectedBlog] = useState<Partial<Blog>>({
        title_en: '',
        title_es: '',
        subtitle_en: '',
        subtitle_es: '',
        content_en: '',
        content_es: '',
        footer_en: '',
        footer_es: '',
        bibliography_en: '',
        bibliography_es: '',
        tags: [],
        published: false
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    
    // Tags state
    const [pendingTag, setPendingTag] = useState('');
    const tagsInputRef = useRef<HTMLInputElement | null>(null);

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
        if (!newsletterBlog) {
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
        const preview = buildNewsletterEmail(newsletterBlog, recipients[0])
        setEmailPreview(preview)
    }, [newsletterBlog, selectedRecipients, subscribers])

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
        setSelectedBlog({
            title_en: '',
            title_es: '',
            subtitle_en: '',
            subtitle_es: '',
            content_en: '',
            content_es: '',
            footer_en: '',
            footer_es: '',
            bibliography_en: '',
            bibliography_es: '',
            tags: [],
            published: false
        })
        setFormError(null)
    }

    const handleSelectBlog = (blog: Blog) => {
        setSelectedBlog({
            ...blog,
            title_en: blog.title_en || blog.title || '',
            title_es: blog.title_es || '',
            subtitle_en: blog.subtitle_en || blog.subtitle || '',
            subtitle_es: blog.subtitle_es || '',
            content_en: blog.content_en || blog.content || '',
            content_es: blog.content_es || '',
            footer_en: blog.footer_en || blog.footer || '',
            footer_es: blog.footer_es || '',
            bibliography_en: blog.bibliography_en || blog.bibliography || '',
            bibliography_es: blog.bibliography_es || '',
            tags: blog.tags || [],
        })
        setFormError(null)
        // Scroll to editor
        const editorElement = document.getElementById('blog-editor');
        if (editorElement) {
            editorElement.scrollIntoView({ behavior: 'smooth' });
        }
    }

    const commitPendingTag = useCallback((raw?: string) => {
        const value = typeof raw === 'string' ? raw : pendingTag;
        const normalized = value.trim().replace(/\s+/g, '-').toLowerCase();
        if (!normalized) {
            setPendingTag('');
            return;
        }
        if (selectedBlog.tags?.includes(normalized)) {
            setPendingTag('');
            return;
        }
        setSelectedBlog(prev => ({
            ...prev,
            tags: [...(prev.tags || []), normalized]
        }));
        setPendingTag('');
    }, [pendingTag, selectedBlog.tags]);

    const removeTag = useCallback((tag: string) => {
        setSelectedBlog(prev => ({
            ...prev,
            tags: (prev.tags || []).filter((item) => item !== tag)
        }));
    }, []);

    const handleTagInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        if (value.includes(',')) {
            const parts = value.split(',');
            const last = parts.pop() ?? '';
            parts.forEach((part) => commitPendingTag(part));
            setPendingTag(last);
        } else {
            setPendingTag(value);
        }
    }, [commitPendingTag]);

    const handleTagInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' || event.key === 'Tab') {
            if (pendingTag.trim()) {
                event.preventDefault();
                commitPendingTag();
            }
        }
        if (event.key === 'Backspace' && !pendingTag) {
            setSelectedBlog(prev => ({
                ...prev,
                tags: (prev.tags || []).slice(0, -1)
            }));
        }
    }, [commitPendingTag, pendingTag]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setIsSubmitting(true);

        const englishTitle = requiredField(selectedBlog.title_en || '');
        const englishSubtitle = requiredField(selectedBlog.subtitle_en || '');
        const spanishTitle = requiredField(selectedBlog.title_es || '');
        const spanishSubtitle = requiredField(selectedBlog.subtitle_es || '');

        const blogData = {
            ...selectedBlog,
            title_en: englishTitle,
            title_es: spanishTitle,
            subtitle_en: englishSubtitle,
            subtitle_es: spanishSubtitle,
            slug: slugify(englishTitle || spanishTitle),
            // Legacy fallbacks
            title: englishTitle || spanishTitle,
            subtitle: englishSubtitle || spanishSubtitle,
            content: selectedBlog.content_en || selectedBlog.content_es,
            footer: selectedBlog.footer_en || selectedBlog.footer_es,
            bibliography: selectedBlog.bibliography_en || selectedBlog.bibliography_es,
        };

        try {
            // Validate loosely first since we might be in draft
            // BlogSchema.parse(blogData); 

            const url = selectedBlog._id ? `/api/blogs/${selectedBlog._id}` : '/api/blogs';
            const method = selectedBlog._id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(blogData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save blog');
            }

            const savedBlog = await response.json();

            if (method === 'POST') {
                setBlogs([savedBlog, ...blogs]);
            } else {
                setBlogs(blogs.map(b => b._id === savedBlog._id ? savedBlog : b));
            }

            toast({
                title: 'Success',
                description: `Blog post ${method === 'POST' ? 'created' : 'updated'} successfully.`,
            });

            // Update selection to the saved blog
            handleSelectBlog(savedBlog);
        } catch (err) {
            if (err instanceof ZodError) {
                setFormError(err.issues[0]?.message ?? 'Please review the highlighted fields');
            } else if (err instanceof Error) {
                setFormError(err.message);
            } else {
                setFormError('An error occurred while saving the blog');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const userInput = prompt('Type DELETE to confirm removing this blog post')
        if (!userInput || userInput.trim().toUpperCase() !== 'DELETE') {
            return
        }
        try {
            const response = await fetch(`/api/blogs/${id}`, {
                method: 'DELETE',
            })

            if (!response.ok) throw new Error('Failed to delete blog post')

            setBlogs(blogs.filter(b => b._id !== id));
            
            if (selectedBlog._id === id) {
                handleNewPost();
            }

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

    const openNewsletterModal = (blog: Blog, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setNewsletterBlog(blog)
        const defaultRecipients = subscribers.filter(sub => !sub.unsubscribed).map(sub => sub._id?.toString() || '')
        setSelectedRecipients(defaultRecipients)
        setEmailPreview(null)
        setNewsletterModalOpen(true)
    }

    const handleSendNewsletter = async () => {
        if (!newsletterBlog || selectedRecipients.length === 0) {
            toast({ title: 'Recipients required', description: 'Select at least one subscriber.', variant: 'destructive' })
            return
        }
        setIsSending(true)
        try {
            const response = await fetch(`/api/blogs/${newsletterBlog._id}/send-newsletter`, {
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

    const toggleRecipient = (id: string) => {
        setSelectedRecipients(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
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

    return (
        <div className="h-full min-h-0 flex flex-col p-6 gap-6">
            {/* Horizontal Blog Rail */}
            <Card className="bg-white border border-slate-200 shadow-sm shrink-0">
                <CardContent className="py-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
                            <FileText className="w-5 h-5 text-slate-700" />
                            <span className="text-sm font-semibold text-slate-800">Blogs ({blogs.length})</span>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search blogs..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-64 pl-9 max-w-full h-9 border-slate-200 focus-visible:ring-[#FD4345]"
                            />
                        </div>
                        <div className="flex-1 overflow-x-auto pb-2 lg:pb-0">
                            <div className="flex gap-3 min-w-fit px-1">
                                {blogs
                                    .filter((b) => {
                                        const q = search.toLowerCase();
                                        return (b.title_en || b.title || '').toLowerCase().includes(q) || 
                                               (b.subtitle_en || b.subtitle || '').toLowerCase().includes(q);
                                    })
                                    .map((blog) => {
                                        const isSelected = selectedBlog._id === blog._id;
                                        return (
                                            <div
                                                key={blog._id}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-all duration-200 shadow-sm group cursor-pointer ${isSelected
                                                    ? 'bg-[#263547] text-white border-[#263547]'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#FD4345]/50 hover:text-slate-900'
                                                }`}
                                                onClick={() => handleSelectBlog(blog)}
                                            >
                                                <div className="flex flex-col max-w-[160px]">
                                                    <div className="font-semibold line-clamp-1">{blog.title_en || blog.title}</div>
                                                    <div className="text-[10px] opacity-80 flex items-center gap-1">
                                                        <span>{blog.published ? 'Published' : 'Draft'}</span>
                                                        {/* Send Icon Mini */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={`h-4 w-4 p-0 ml-1 ${isSelected ? 'text-white hover:text-white/80' : 'text-slate-400 hover:text-[#FD4345]'}`}
                                                            onClick={(e) => openNewsletterModal(blog, e)}
                                                            title="Send Newsletter"
                                                        >
                                                            <Send className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-6 w-6 ml-1 rounded-full ${isSelected ? 'text-white hover:bg-white/20' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                                                    onClick={(e) => handleDelete(blog._id!, e)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                {blogs.length === 0 && (
                                    <span className="text-sm text-slate-500 italic px-2">No blogs found</span>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Editor Area */}
            <Card className="bg-white border border-slate-200 shadow-md flex-1 flex flex-col overflow-hidden min-h-0" id="blog-editor">
                <CardHeader className="bg-[#263547] py-4 px-6 border-b border-slate-700 shrink-0">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg text-white">
                            {selectedBlog._id ? (
                                <>
                                    <Edit className="w-5 h-5 text-[#FD4345]" />
                                    Edit Blog Post
                                </>
                            ) : (
                                <>
                                    <Plus className="w-5 h-5 text-[#FD4345]" />
                                    Create New Blog Post
                                </>
                            )}
                        </CardTitle>
                        <div className="flex gap-2">
                             {selectedBlog._id && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-slate-300 hover:text-white hover:bg-white/10"
                                    onClick={handleNewPost}
                                >
                                    <Plus className="w-4 h-4 mr-2" /> New Post
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="p-0 flex-1 overflow-hidden flex flex-col min-h-0">
                    <form onSubmit={handleSave} className="flex flex-col h-full min-h-0">
                        <div className="flex-1 overflow-y-auto p-6 min-h-0">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* English Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-0 uppercase tracking-wider font-bold px-2.5">English</Badge>
                                        <Globe className="w-4 h-4 text-slate-400" />
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 font-semibold" htmlFor="title-en">Title <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="title-en"
                                                value={selectedBlog.title_en || ''}
                                                onChange={(e) => setSelectedBlog({...selectedBlog, title_en: e.target.value})}
                                                placeholder="Enter English title"
                                                className="focus-visible:ring-[#FD4345]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 font-semibold" htmlFor="subtitle-en">Subtitle <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="subtitle-en"
                                                value={selectedBlog.subtitle_en || ''}
                                                onChange={(e) => setSelectedBlog({...selectedBlog, subtitle_en: e.target.value})}
                                                placeholder="Enter English subtitle"
                                                className="focus-visible:ring-[#FD4345]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 font-semibold">Content</Label>
                                            <div className="border rounded-md focus-within:ring-1 focus-within:ring-[#FD4345]">
                                                <TinyMCE 
                                                    value={selectedBlog.content_en || ''} 
                                                    onChange={(val) => setSelectedBlog({...selectedBlog, content_en: val})} 
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 font-semibold" htmlFor="footer-en">Footer</Label>
                                            <Input
                                                id="footer-en"
                                                value={selectedBlog.footer_en || ''}
                                                onChange={(e) => setSelectedBlog({...selectedBlog, footer_en: e.target.value})}
                                                placeholder="Optional English footer"
                                                className="focus-visible:ring-[#FD4345]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 font-semibold" htmlFor="bibliography-en">Bibliography</Label>
                                            <Input
                                                id="bibliography-en"
                                                value={selectedBlog.bibliography_en || ''}
                                                onChange={(e) => setSelectedBlog({...selectedBlog, bibliography_en: e.target.value})}
                                                placeholder="Optional English bibliography"
                                                className="focus-visible:ring-[#FD4345]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Spanish Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <Badge className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-0 uppercase tracking-wider font-bold px-2.5">Español</Badge>
                                        <Globe className="w-4 h-4 text-slate-400" />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 font-semibold" htmlFor="title-es">Título <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="title-es"
                                                value={selectedBlog.title_es || ''}
                                                onChange={(e) => setSelectedBlog({...selectedBlog, title_es: e.target.value})}
                                                placeholder="Introduce el título en español"
                                                className="focus-visible:ring-[#FD4345]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 font-semibold" htmlFor="subtitle-es">Subtítulo <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="subtitle-es"
                                                value={selectedBlog.subtitle_es || ''}
                                                onChange={(e) => setSelectedBlog({...selectedBlog, subtitle_es: e.target.value})}
                                                placeholder="Introduce el subtítulo en español"
                                                className="focus-visible:ring-[#FD4345]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 font-semibold">Contenido</Label>
                                            <div className="border rounded-md focus-within:ring-1 focus-within:ring-[#FD4345]">
                                                <TinyMCE 
                                                    value={selectedBlog.content_es || ''} 
                                                    onChange={(val) => setSelectedBlog({...selectedBlog, content_es: val})} 
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 font-semibold" htmlFor="footer-es">Pie</Label>
                                            <Input
                                                id="footer-es"
                                                value={selectedBlog.footer_es || ''}
                                                onChange={(e) => setSelectedBlog({...selectedBlog, footer_es: e.target.value})}
                                                placeholder="Pie de página opcional"
                                                className="focus-visible:ring-[#FD4345]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 font-semibold" htmlFor="bibliography-es">Bibliografía</Label>
                                            <Input
                                                id="bibliography-es"
                                                value={selectedBlog.bibliography_es || ''}
                                                onChange={(e) => setSelectedBlog({...selectedBlog, bibliography_es: e.target.value})}
                                                placeholder="Bibliografía opcional"
                                                className="focus-visible:ring-[#FD4345]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100 mt-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-semibold" htmlFor="tags">Tags</Label>
                                    <div className="rounded-md border border-slate-200 bg-white p-2 focus-within:ring-2 focus-within:ring-[#FD4345] focus-within:ring-offset-2 transition-all">
                                        <div className="flex flex-wrap gap-2">
                                            {(selectedBlog.tags || []).map((tag) => (
                                                <Badge
                                                    key={tag}
                                                    variant="secondary"
                                                    className="flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 pl-2 pr-1 py-1"
                                                >
                                                    {tag}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTag(tag)}
                                                        className="ml-1 rounded-full hover:bg-slate-300 p-0.5 transition-colors"
                                                    >
                                                        <span className="sr-only">Remove</span>
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            ))}
                                            <input
                                                id="tags"
                                                ref={tagsInputRef}
                                                value={pendingTag}
                                                onChange={handleTagInputChange}
                                                onBlur={() => commitPendingTag()}
                                                onKeyDown={handleTagInputKeyDown}
                                                placeholder={selectedBlog.tags?.length ? '' : 'Add tags (press Enter)...'}
                                                className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none min-w-[120px]"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Separate with commas or press enter to add.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-semibold mb-2 block">Status</Label>
                                    <div className="flex items-center space-x-3 p-3 rounded-md border border-slate-200 bg-slate-50">
                                        <Switch
                                            checked={selectedBlog.published}
                                            onCheckedChange={(checked) => setSelectedBlog({...selectedBlog, published: checked})}
                                            id="published"
                                            className="data-[state=checked]:bg-[#FD4345]"
                                        />
                                        <div className="flex flex-col">
                                            <Label htmlFor="published" className="font-medium text-slate-900 cursor-pointer">
                                                {selectedBlog.published ? 'Published' : 'Draft'}
                                            </Label>
                                            <span className="text-xs text-slate-500">
                                                {selectedBlog.published ? 'Visible to all visitors' : 'Only visible to admins'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {formError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2 text-sm mt-6">
                                    <X className="w-4 h-4 shrink-0" />
                                    {formError}
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 bg-white border-t border-slate-200 py-4 px-6 mt-auto z-10 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                             <Button
                                type="button"
                                variant="ghost"
                                onClick={handleNewPost}
                                className="text-slate-500 hover:text-slate-700"
                            >
                                Reset Form
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-[#FD4345] hover:bg-[#ff5456] text-white shadow-md transition-all min-w-[140px]"
                            >
                                {isSubmitting ? (
                                    <>Saving...</>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        {selectedBlog._id ? 'Update Post' : 'Create Post'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Newsletter Modal (unchanged logic, just re-inserted) */}
            <Dialog open={newsletterModalOpen} onOpenChange={(open) => {
                if (!open) setNewsletterModalOpen(false)
            }}>
                <DialogContent className="max-w-5xl bg-white max-h-[calc(100vh-4rem)] overflow-y-auto p-0 gap-0">
                    {/* ... Newsletter Content (same as before) ... */}
                     <div className="p-6 border-b border-slate-100">
                        <DialogHeader className="space-y-2">
                            <DialogTitle className="text-xl">Send blog to subscribers</DialogTitle>
                            <DialogDescription>
                                Choose recipients, review the preview, and send a formatted newsletter email for <span className="font-semibold text-slate-900">{newsletterBlog?.title_en || newsletterBlog?.title}</span>.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    <div className="p-6 grid lg:grid-cols-[minmax(260px,1fr)_minmax(320px,1.25fr)] gap-6">
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col shadow-sm">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Recipients</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Select at least one active subscriber.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => {
                                                const allActive = subscribers.filter(sub => !sub.unsubscribed).map(sub => sub._id?.toString() || '')
                                                setSelectedRecipients(allActive)
                                            }}
                                        >
                                            Select all
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-slate-500 hover:text-slate-900"
                                            onClick={() => setSelectedRecipients([])}
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        value={recipientSearch}
                                        onChange={(e) => setRecipientSearch(e.target.value)}
                                        placeholder="Filter subscribers..."
                                        className="h-8 pl-8 text-xs bg-white"
                                    />
                                </div>
                            </div>
                            
                            <div className="h-[340px] overflow-y-auto bg-white">
                                <div className="divide-y divide-slate-50">
                                    {filteredSubscribers.map((sub) => {
                                        const id = sub._id?.toString() || ''
                                        if (!id) return null
                                        const checked = selectedRecipients.includes(id)
                                        return (
                                            <label
                                                key={id}
                                                className={`flex items-start gap-3 p-3 text-sm transition cursor-pointer ${checked ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={() => toggleRecipient(id)}
                                                    className="mt-0.5 data-[state=checked]:bg-[#FD4345] data-[state=checked]:border-[#FD4345]"
                                                />
                                                <div className="space-y-0.5 flex-1">
                                                    <p className="font-medium text-slate-800 text-sm">{sub.email}</p>
                                                    <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 uppercase tracking-wide font-medium">
                                                        <span className="text-slate-400">{(sub.language || 'en')}</span>
                                                        <span className={sub.unsubscribed ? 'text-red-500' : 'text-emerald-600'}>
                                                            {sub.unsubscribed ? 'Unsubscribed' : 'Active'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="p-2 bg-slate-50 border-t border-slate-200 text-xs text-center text-slate-500 font-medium">
                                {selectedRecipients.length} selected
                            </div>
                        </div>

                        <div className="space-y-5 flex flex-col h-full">
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col flex-1">
                                <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50/50 rounded-t-xl">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Preview</p>
                                        <p className="text-xs text-slate-500">Visual preview for the first recipient</p>
                                    </div>
                                </div>
                                {emailPreview ? (
                                    <div className="flex flex-col h-full">
                                        <div className="bg-[#263547] text-white px-4 py-3 border-b border-slate-700">
                                            <div className="flex gap-3 text-sm">
                                                <span className="text-slate-400 font-medium w-14">Subject:</span>
                                                <span className="font-medium">{emailPreview.subject}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto bg-white p-6">
                                            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: emailPreview.html }} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                            <Eye className="w-6 h-6 text-slate-300" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-900">No Preview Available</p>
                                        <p className="text-xs text-slate-500 mt-1">Select at least one active subscriber to generate a preview.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setNewsletterModalOpen(false)} className="border-slate-300">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSendNewsletter} 
                            disabled={isSending || selectedRecipients.length === 0}
                            className="bg-[#FD4345] hover:bg-[#ff5456] text-white pl-5 pr-6"
                        >
                            {isSending ? (
                                <>Sending...</>
                            ) : (
                                <>
                                    Send Newsletter <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
