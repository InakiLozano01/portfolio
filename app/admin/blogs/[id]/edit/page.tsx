'use client';

import { useState, useEffect } from 'react';
import { useRouter, notFound } from 'next/navigation';
import { TinyMCE } from '@/components/ui/tinymce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BlogSchema } from '@/models/BlogClient';
import { slugify } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ZodError } from 'zod';

interface EditBlogPageProps {
    params: {
        id: string;
    };
}

const requiredField = (value: string) => value.trim();

export default function EditBlogPage({ params }: EditBlogPageProps) {
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

    const [published, setPublished] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBlog = async () => {
            try {
                const response = await fetch(`/api/blogs/${params.id}`);
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
    }, [params.id]);

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

            const response = await fetch(`/api/blogs/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(blogData),
            });

            if (!response.ok) {
                throw new Error('Failed to update blog');
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

    const handleTagsChange = (value: string) => {
        const newTags = value
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
        setTags(newTags);
    };

    const handleBack = () => {
        router.push('/#blog');
        router.refresh();
    };

    if (loading) {
        return (
            <Card className="max-w-5xl mx-auto">
                <CardContent className="p-6">
                    <div className="text-center">Loading blog...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="max-w-5xl mx-auto">
            <CardHeader>
                <CardTitle>Edit Blog</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold mb-2">English</h3>
                            <div className="space-y-2">
                                <Label className="text-gray-900" htmlFor="title-en">Title (EN)</Label>
                                <Input
                                    id="title-en"
                                    value={titleEn}
                                    onChange={(e) => setTitleEn(e.target.value)}
                                    placeholder="Enter English title"
                                    required
                                    className="bg-white text-black placeholder:text-gray-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-900" htmlFor="subtitle-en">Subtitle (EN)</Label>
                                <Input
                                    id="subtitle-en"
                                    value={subtitleEn}
                                    onChange={(e) => setSubtitleEn(e.target.value)}
                                    placeholder="Enter English subtitle"
                                    required
                                    className="bg-white text-black placeholder:text-gray-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-900">Content (EN)</Label>
                                <TinyMCE value={contentEn} onChange={setContentEn} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-900" htmlFor="footer-en">Footer (EN)</Label>
                                <Input
                                    id="footer-en"
                                    value={footerEn}
                                    onChange={(e) => setFooterEn(e.target.value)}
                                    placeholder="Optional English footer"
                                    className="bg-white text-black placeholder:text-gray-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-900" htmlFor="bibliography-en">Bibliography (EN)</Label>
                                <Input
                                    id="bibliography-en"
                                    value={bibliographyEn}
                                    onChange={(e) => setBibliographyEn(e.target.value)}
                                    placeholder="Optional English bibliography"
                                    className="bg-white text-black placeholder:text-gray-500"
                                />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Español</h3>
                            <div className="space-y-2">
                                <Label className="text-gray-900" htmlFor="title-es">Título (ES)</Label>
                                <Input
                                    id="title-es"
                                    value={titleEs}
                                    onChange={(e) => setTitleEs(e.target.value)}
                                    placeholder="Introduce el título en español"
                                    required
                                    className="bg-white text-black placeholder:text-gray-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-900" htmlFor="subtitle-es">Subtítulo (ES)</Label>
                                <Input
                                    id="subtitle-es"
                                    value={subtitleEs}
                                    onChange={(e) => setSubtitleEs(e.target.value)}
                                    placeholder="Introduce el subtítulo en español"
                                    required
                                    className="bg-white text-black placeholder:text-gray-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-900">Contenido (ES)</Label>
                                <TinyMCE value={contentEs} onChange={setContentEs} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-900" htmlFor="footer-es">Pie (ES)</Label>
                                <Input
                                    id="footer-es"
                                    value={footerEs}
                                    onChange={(e) => setFooterEs(e.target.value)}
                                    placeholder="Pie de página opcional"
                                    className="bg-white text-black placeholder:text-gray-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-900" htmlFor="bibliography-es">Bibliografía (ES)</Label>
                                <Input
                                    id="bibliography-es"
                                    value={bibliographyEs}
                                    onChange={(e) => setBibliographyEs(e.target.value)}
                                    placeholder="Bibliografía opcional"
                                    className="bg-white text-black placeholder:text-gray-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-900" htmlFor="tags">Tags (comma-separated)</Label>
                        <Input
                            id="tags"
                            value={tags.join(', ')}
                            onChange={(e) => handleTagsChange(e.target.value)}
                            placeholder="Enter tags, separated by commas"
                            className="bg-white text-black placeholder:text-gray-500"
                        />
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
                                className="bg-white text-black"
                            />
                            <Button
                                type="button"
                                disabled={!pdfEnFile || pdfUploading}
                                onClick={async () => {
                                    if (!pdfEnFile) return;
                                    setPdfUploading(true);
                                    const fd = new FormData();
                                    fd.append('file', pdfEnFile);
                                    fd.append('lang', 'en');
                                    const res = await fetch(`/api/blogs/${params.id}/pdf`, { method: 'POST', body: fd });
                                    setPdfUploading(false);
                                    if (res.ok) {
                                        const data = await res.json();
                                        setPdfEn(data.path);
                                        setPdfEnFile(null);
                                    }
                                }}
                            >
                                Upload EN PDF
                            </Button>
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
                                className="bg-white text-black"
                            />
                            <Button
                                type="button"
                                disabled={!pdfEsFile || pdfUploading}
                                onClick={async () => {
                                    if (!pdfEsFile) return;
                                    setPdfUploading(true);
                                    const fd = new FormData();
                                    fd.append('file', pdfEsFile);
                                    fd.append('lang', 'es');
                                    const res = await fetch(`/api/blogs/${params.id}/pdf`, { method: 'POST', body: fd });
                                    setPdfUploading(false);
                                    if (res.ok) {
                                        const data = await res.json();
                                        setPdfEs(data.path);
                                        setPdfEsFile(null);
                                    }
                                }}
                            >
                                Upload ES PDF
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            checked={published}
                            onCheckedChange={setPublished}
                            id="published"
                        />
                        <Label htmlFor="published" className="text-gray-900">Published</Label>
                    </div>

                    {error && (
                        <p className="text-sm text-red-500">{error}</p>
                    )}

                    <div className="flex justify-end space-x-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleBack}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Blog'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
