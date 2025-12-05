'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TinyMCE } from '@/components/ui/tinymce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BlogSchema } from '@/models/BlogClient';
import { slugify } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ZodError } from 'zod';
import { ArrowLeft, Save, FileText, Globe, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const requiredField = (value: string) => value.trim();

export default function NewBlogPage() {
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

    const [published, setPublished] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleBack = () => {
        router.push('/admin#blog');
        router.refresh();
    };

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
            // Legacy fallbacks for existing consumers
            title: englishTitle || spanishTitle,
            subtitle: englishSubtitle || spanishSubtitle,
            content: contentEn || contentEs,
            footer: englishFooter || spanishFooter || undefined,
            bibliography: englishBibliography || spanishBibliography || undefined,
        };

        try {
            BlogSchema.parse(blogData);

            const response = await fetch('/api/blogs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(blogData),
            });

            if (!response.ok) {
                throw new Error('Failed to create blog');
            }

            router.push('/admin');
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

    const tagsInputRef = useRef<HTMLInputElement | null>(null);
    const [pendingTag, setPendingTag] = useState('');

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

    return (
        <Card className="max-w-7xl mx-auto border-slate-200 shadow-sm bg-white">
            <CardHeader className="bg-[#263547] py-4 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2 text-white">
                    <FileText className="w-6 h-6 text-[#FD4345]" />
                    <CardTitle className="text-xl font-semibold">Create New Blog Post</CardTitle>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                    className="text-slate-300 hover:text-white hover:bg-white/10"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Admin
                </Button>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-8">
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
                                        value={titleEn}
                                        onChange={(e) => setTitleEn(e.target.value)}
                                        placeholder="Enter English title"
                                        className="focus-visible:ring-[#FD4345]"
                                        required
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
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-semibold">Content</Label>
                                    <div className="border rounded-md focus-within:ring-1 focus-within:ring-[#FD4345]">
                                        <TinyMCE value={contentEn} onChange={setContentEn} />
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
                                        value={titleEs}
                                        onChange={(e) => setTitleEs(e.target.value)}
                                        placeholder="Introduce el título en español"
                                        className="focus-visible:ring-[#FD4345]"
                                        required
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
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-semibold">Contenido</Label>
                                    <div className="border rounded-md focus-within:ring-1 focus-within:ring-[#FD4345]">
                                        <TinyMCE value={contentEs} onChange={setContentEs} />
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
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-semibold" htmlFor="tags">Tags</Label>
                            <div className="rounded-md border border-slate-200 bg-white p-2 focus-within:ring-2 focus-within:ring-[#FD4345] focus-within:ring-offset-2 transition-all">
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => (
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
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
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
                                        placeholder={tags.length ? '' : 'Add tags (press Enter)...'}
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
                                    checked={published}
                                    onCheckedChange={setPublished}
                                    id="published"
                                    className="data-[state=checked]:bg-[#FD4345]"
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

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleBack}
                            className="border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-[#FD4345] hover:bg-[#ff5456] text-white shadow-md transition-all"
                        >
                            {isSubmitting ? (
                                <>Saving...</>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Create Post
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
