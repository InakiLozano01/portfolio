'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, notFound } from 'next/navigation';
import { TinyMCE } from '@/components/ui/tinymce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BlogSchema } from '@/models/BlogClient';
import { slugify } from '@/lib/utils';
import { saveBlogRequest } from '@/lib/admin-blog-save';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ZodError } from 'zod';
import { AlertCircle, ArrowLeft, FileText, Globe, Loader2, Save, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EditBlogPageProps {
    params: Promise<{
        id: string;
    }>;
}

const requiredField = (value: string) => value.trim();

export default function EditBlogPage({ params }: EditBlogPageProps) {
    const { id } = use(params);
    const router = useRouter();

    const [titleEn, setTitleEn] = useState('');
    const [subtitleEn, setSubtitleEn] = useState('');
    const [contentEn, setContentEn] = useState('');
    const [footerEn, setFooterEn] = useState('');
    const [bibliographyEn, setBibliographyEn] = useState('');

    const [titleEs, setTitleEs] = useState('');
    const [subtitleEs, setSubtitleEs] = useState('');
    const [contentEs, setContentEs] = useState('');
    const [footerEs, setFooterEs] = useState('');
    const [bibliographyEs, setBibliographyEs] = useState('');

    const [pdfEn, setPdfEn] = useState<string | null>(null);
    const [pdfEs, setPdfEs] = useState<string | null>(null);
    const [pdfEnFile, setPdfEnFile] = useState<File | null>(null);
    const [pdfEsFile, setPdfEsFile] = useState<File | null>(null);
    const [pdfUploading, setPdfUploading] = useState(false);
    const [pdfGenerating, setPdfGenerating] = useState<'en' | 'es' | 'both' | null>(null);
    const [pdfGenError, setPdfGenError] = useState<string | null>(null);
    const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);

    const [published, setPublished] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [pendingTag, setPendingTag] = useState('');
    const tagsInputRef = useRef<HTMLInputElement | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBlog = async () => {
            try {
                const response = await fetch(`/api/blogs/${id}`);
                if (!response.ok) {
                    if (response.status === 404) {
                        notFound();
                    }
                    throw new Error('Failed to fetch blog');
                }
                const blog = await response.json();

                const englishTitle = blog.title_en || blog.title || '';
                const spanishTitle = blog.title_es || blog.title || '';
                const englishSubtitle = blog.subtitle_en || blog.subtitle || '';
                const spanishSubtitle = blog.subtitle_es || blog.subtitle || '';
                const englishContent = blog.content_en || blog.content || '';
                const spanishContent = blog.content_es || blog.content || '';

                setTitleEn(englishTitle);
                setSubtitleEn(englishSubtitle);
                setContentEn(englishContent);
                setFooterEn(blog.footer_en || blog.footer || '');
                setBibliographyEn(blog.bibliography_en || blog.bibliography || '');

                setTitleEs(spanishTitle);
                setSubtitleEs(spanishSubtitle);
                setContentEs(spanishContent);
                setFooterEs(blog.footer_es || blog.footer || '');
                setBibliographyEs(blog.bibliography_es || blog.bibliography || '');

                setPdfEn(blog.pdf_en || null);
                setPdfEs(blog.pdf_es || null);
                setPublished(blog.published);
                setTags(blog.tags || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch blog');
            } finally {
                setLoading(false);
            }
        };

        fetchBlog();
    }, [id]);

    const commitPendingTag = useCallback((raw?: string) => {
        const value = typeof raw === 'string' ? raw : pendingTag;
        const normalized = value.trim().replace(/\s+/g, '-').toLowerCase();
        if (!normalized) {
            setPendingTag('');
            return;
        }
        if (tags.includes(normalized)) {
            setPendingTag('');
            return;
        }
        setTags((prev) => [...prev, normalized]);
        setPendingTag('');
    }, [pendingTag, tags]);

    const removeTag = useCallback((tag: string) => {
        setTags((prev) => prev.filter((item) => item !== tag));
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
            setTags((prev) => prev.slice(0, -1));
        }
    }, [commitPendingTag, pendingTag]);

    useEffect(() => {
        if (!pendingTag) return;
        if (!pendingTag.includes(',')) return;
        const parts = pendingTag.split(',');
        const last = parts.pop() ?? '';
        parts.forEach((part) => commitPendingTag(part));
        setPendingTag(last);
    }, [pendingTag, commitPendingTag]);

    const generatePdf = useCallback(async (lang: 'en' | 'es' | 'both') => {
        setPdfGenError(null);
        setPdfGenerating(lang);
        try {
            const res = await fetch(`/api/blogs/${id}/pdf/generate?lang=${lang}`, { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.error || 'Failed to generate PDF');
            }
            if (typeof data.pdf_en === 'string') setPdfEn(data.pdf_en);
            if (typeof data.pdf_es === 'string') setPdfEs(data.pdf_es);
        } catch (err) {
            setPdfGenError(err instanceof Error ? err.message : 'Failed to generate PDF');
        } finally {
            setPdfGenerating(null);
        }
    }, [id]);

    const uploadPdf = useCallback(async (lang: 'en' | 'es', file: File | null) => {
        if (!file) return;
        setPdfUploadError(null);
        setPdfUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('lang', lang);
            const res = await fetch(`/api/blogs/${id}/pdf`, { method: 'POST', body: fd });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(typeof data?.error === 'string' ? data.error : `Failed to upload ${lang.toUpperCase()} PDF`);
            }
            if (typeof data?.path !== 'string') {
                throw new Error('PDF upload completed without a file path');
            }
            if (lang === 'en') {
                setPdfEn(data.path);
                setPdfEnFile(null);
            } else {
                setPdfEs(data.path);
                setPdfEsFile(null);
            }
        } catch (err) {
            setPdfUploadError(err instanceof Error ? err.message : 'Failed to upload PDF');
        } finally {
            setPdfUploading(false);
        }
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const englishTitle = requiredField(titleEn);
        const englishSubtitle = requiredField(subtitleEn);
        const spanishTitle = requiredField(titleEs);
        const spanishSubtitle = requiredField(subtitleEs);

        const englishFooter = footerEn.trim();
        const spanishFooter = footerEs.trim();
        const englishBibliography = bibliographyEn.trim();
        const spanishBibliography = bibliographyEs.trim();

        const blogData = {
            title_en: englishTitle,
            title_es: spanishTitle,
            subtitle_en: englishSubtitle,
            subtitle_es: spanishSubtitle,
            content_en: contentEn,
            content_es: contentEs,
            footer_en: englishFooter || undefined,
            footer_es: spanishFooter || undefined,
            bibliography_en: englishBibliography || undefined,
            bibliography_es: spanishBibliography || undefined,
            published,
            slug: slugify(englishTitle || spanishTitle),
            tags,
            title: englishTitle || spanishTitle,
            subtitle: englishSubtitle || spanishSubtitle,
            content: contentEn || contentEs,
            footer: englishFooter || spanishFooter || undefined,
            bibliography: englishBibliography || spanishBibliography || undefined,
        };

        try {
            BlogSchema.parse(blogData);

            await saveBlogRequest(`/api/blogs/${id}`, 'PUT', blogData);

            router.push('/admin#blogs');
            router.refresh();
        } catch (err) {
            if (err instanceof ZodError) {
                setError(err.issues[0]?.message ?? 'Please review the highlighted fields');
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An error occurred while saving the blog');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        router.push('/admin#blogs');
        router.refresh();
    };

    if (loading) {
        return (
            <div className="min-h-screen overflow-y-auto p-4 md:p-6 bg-slate-50">
                <Card className="max-w-5xl mx-auto">
                    <CardContent className="p-6">
                        <div className="text-center">Loading blog...</div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen overflow-y-auto p-4 md:p-6 bg-slate-50">
        <Card className="max-w-7xl mx-auto border-slate-200 shadow-sm bg-white">
            <CardHeader className="bg-[#263547] py-4 px-4 md:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 text-white">
                    <FileText className="w-6 h-6 text-[#FD4345]" />
                    <CardTitle className="text-lg md:text-xl font-semibold text-white">Edit Blog Post</CardTitle>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                    className="text-slate-300 hover:text-white hover:bg-white/10 shrink-0"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Admin
                </Button>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
                <form onSubmit={handleSubmit} className="space-y-8" aria-busy={isSubmitting}>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
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
                                    value={titleEn}
                                    onChange={(e) => setTitleEn(e.target.value)}
                                    placeholder="Enter English title"
                                    className="focus-visible:ring-[#FD4345]"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold" htmlFor="subtitle-en">Subtitle <span className="text-red-500">*</span></Label>
                                <Input
                                    id="subtitle-en"
                                    value={subtitleEn}
                                    onChange={(e) => setSubtitleEn(e.target.value)}
                                    placeholder="Enter English subtitle"
                                    className="focus-visible:ring-[#FD4345]"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold" htmlFor="edit-content-en">Content</Label>
                                <div className="border rounded-md focus-within:ring-1 focus-within:ring-[#FD4345]">
                                    <TinyMCE id="edit-content-en" value={contentEn} onChange={setContentEn} disabled={isSubmitting} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold" htmlFor="footer-en">Footer</Label>
                                <Input
                                    id="footer-en"
                                    value={footerEn}
                                    onChange={(e) => setFooterEn(e.target.value)}
                                    placeholder="Optional English footer"
                                    className="focus-visible:ring-[#FD4345]"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold" htmlFor="bibliography-en">Bibliography</Label>
                                <Input
                                    id="bibliography-en"
                                    value={bibliographyEn}
                                    onChange={(e) => setBibliographyEn(e.target.value)}
                                    placeholder="Optional English bibliography"
                                    className="focus-visible:ring-[#FD4345]"
                                    disabled={isSubmitting}
                                />
                            </div>
                            </div>
                        </div>
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
                                    value={titleEs}
                                    onChange={(e) => setTitleEs(e.target.value)}
                                    placeholder="Introduce el título en español"
                                    className="focus-visible:ring-[#FD4345]"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold" htmlFor="subtitle-es">Subtítulo <span className="text-red-500">*</span></Label>
                                <Input
                                    id="subtitle-es"
                                    value={subtitleEs}
                                    onChange={(e) => setSubtitleEs(e.target.value)}
                                    placeholder="Introduce el subtítulo en español"
                                    className="focus-visible:ring-[#FD4345]"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold" htmlFor="edit-content-es">Contenido</Label>
                                <div className="border rounded-md focus-within:ring-1 focus-within:ring-[#FD4345]">
                                    <TinyMCE id="edit-content-es" value={contentEs} onChange={setContentEs} disabled={isSubmitting} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold" htmlFor="footer-es">Pie</Label>
                                <Input
                                    id="footer-es"
                                    value={footerEs}
                                    onChange={(e) => setFooterEs(e.target.value)}
                                    placeholder="Pie de página opcional"
                                    className="focus-visible:ring-[#FD4345]"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold" htmlFor="bibliography-es">Bibliografía</Label>
                                <Input
                                    id="bibliography-es"
                                    value={bibliographyEs}
                                    onChange={(e) => setBibliographyEs(e.target.value)}
                                    placeholder="Bibliografía opcional"
                                    className="focus-visible:ring-[#FD4345]"
                                    disabled={isSubmitting}
                                />
                            </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pt-6 border-t border-slate-100">
                    <div className="space-y-2">
                        <Label className="text-slate-700 font-semibold" htmlFor="tags">Tags</Label>
                        <div className="rounded-md border border-slate-200 bg-white p-2 focus-within:ring-2 focus-within:ring-[#FD4345] focus-within:ring-offset-2 transition-all">
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => removeTag(tag)}
                                        disabled={isSubmitting}
                                        className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                                    >
                                        {tag}
                                        <X className="ml-1 h-3 w-3 text-slate-500" />
                                    </button>
                                ))}
                                <input
                                    id="tags"
                                    ref={tagsInputRef}
                                    value={pendingTag}
                                    onChange={handleTagInputChange}
                                    onBlur={() => commitPendingTag()}
                                    onKeyDown={handleTagInputKeyDown}
                                    placeholder={tags.length ? '' : 'ai, llms, machine-learning'}
                                    className="min-w-[120px] flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Separate with commas or press enter to add. Click a tag to remove.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-700 font-semibold mb-2 block">Status</Label>
                        <div className="flex items-center space-x-3 p-3 rounded-md border border-slate-200 bg-slate-50">
                            <Switch
                                checked={published}
                                onCheckedChange={setPublished}
                                id="published"
                                className="data-[state=checked]:bg-[#FD4345]"
                                disabled={isSubmitting}
                            />
                            <div className="flex flex-col">
                                <Label htmlFor="published" className="font-medium text-slate-900 cursor-pointer">
                                    {published ? 'Published' : 'Draft'}
                                </Label>
                                <span className="text-xs text-slate-500">
                                    {published ? 'Visible to all visitors' : 'Only visible to admins'}
                                </span>
                            </div>
                        </div>
                    </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-gray-900">PDF (EN)</Label>
                            {pdfEn && (
                                <p className="text-sm">
                                    Current: <a href={pdfEn} className="text-primary underline" target="_blank" rel="noreferrer">{pdfEn}</a>
                                </p>
                            )}
                            <Input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setPdfEnFile(e.target.files?.[0] || null)}
                                disabled={pdfUploading || isSubmitting}
                            />
                            <Button
                                type="button"
                                disabled={!pdfEnFile || pdfUploading || isSubmitting}
                                onClick={() => uploadPdf('en', pdfEnFile)}
                            >
                                {pdfUploading && pdfEnFile ? 'Uploading...' : 'Upload EN PDF'}
                            </Button>
                            <div className="pt-1">
                                <Button
                                    type="button"
                                    disabled={pdfGenerating !== null || isSubmitting}
                                    onClick={() => generatePdf('en')}
                                    className="w-full bg-[#1a2433] hover:bg-[#263547] text-white"
                                >
                                    {pdfGenerating === 'en' ? 'Generating…' : 'Generate PDF (EN)'}
                                </Button>
                                <p className="text-xs text-muted-foreground mt-1">Builds a branded PDF from the article content.</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-900">PDF (ES)</Label>
                            {pdfEs && (
                                <p className="text-sm">
                                    Current: <a href={pdfEs} className="text-primary underline" target="_blank" rel="noreferrer">{pdfEs}</a>
                                </p>
                            )}
                            <Input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setPdfEsFile(e.target.files?.[0] || null)}
                                disabled={pdfUploading || isSubmitting}
                            />
                            <Button
                                type="button"
                                disabled={!pdfEsFile || pdfUploading || isSubmitting}
                                onClick={() => uploadPdf('es', pdfEsFile)}
                            >
                                {pdfUploading && pdfEsFile ? 'Uploading...' : 'Upload ES PDF'}
                            </Button>
                            <div className="pt-1">
                                <Button
                                    type="button"
                                    disabled={pdfGenerating !== null || isSubmitting}
                                    onClick={() => generatePdf('es')}
                                    className="w-full bg-[#1a2433] hover:bg-[#263547] text-white"
                                >
                                    {pdfGenerating === 'es' ? 'Generating…' : 'Generate PDF (ES)'}
                                </Button>
                                <p className="text-xs text-muted-foreground mt-1">Genera un PDF de marca desde el contenido.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <Button
                            type="button"
                            disabled={pdfGenerating !== null || isSubmitting}
                            onClick={() => generatePdf('both')}
                            className="bg-[#FD4345] hover:bg-[#ff5456] text-white"
                        >
                            {pdfGenerating === 'both' ? 'Generating both…' : 'Generate PDFs (EN + ES)'}
                        </Button>
                        {pdfGenError && <p className="text-sm text-red-500">{pdfGenError}</p>}
                        {pdfUploadError && <p role="alert" className="text-sm text-red-500">{pdfUploadError}</p>}
                    </div>

                    {error && (
                        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="sticky bottom-0 bg-white border-t border-slate-200 py-4 flex flex-col sm:flex-row justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleBack}
                            disabled={isSubmitting}
                            className="border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-[#FD4345] hover:bg-[#ff5456] text-white"
                            aria-live="polite"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving post...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Blog
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
        </div>
    );
}
