'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TinyMCE } from '@/components/ui/tinymce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Blog, BlogSchema } from '@/models/BlogClient';
import { slugify } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewBlogPage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [content, setContent] = useState('');
    const [footer, setFooter] = useState('');
    const [bibliography, setBibliography] = useState('');
    const [published, setPublished] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const blogData = {
                title,
                subtitle,
                content,
                footer,
                bibliography,
                published,
                slug: slugify(title),
                tags
            };

            // Validate the data
            BlogSchema.parse(blogData);

            // Save the blog
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
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An error occurred while saving the blog');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTagsChange = (value: string) => {
        // Split by commas and clean up whitespace
        const newTags = value.split(',').map(tag => tag.trim()).filter(Boolean);
        setTags(newTags);
    };

    const handleBack = () => {
        router.push('/#blog');
        router.refresh();
    };

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>New Blog</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-gray-900">Title</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter blog title"
                            required
                            className="bg-white text-black placeholder:text-gray-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-900">Subtitle</Label>
                        <Input
                            value={subtitle}
                            onChange={(e) => setSubtitle(e.target.value)}
                            placeholder="Enter blog subtitle"
                            required
                            className="bg-white text-black placeholder:text-gray-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-900">Content</Label>
                        <TinyMCE
                            value={content}
                            onChange={setContent}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-900">Footer</Label>
                        <Input
                            value={footer}
                            onChange={(e) => setFooter(e.target.value)}
                            placeholder="Enter blog footer (optional)"
                            className="bg-white text-black placeholder:text-gray-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-900">Bibliography</Label>
                        <Input
                            value={bibliography}
                            onChange={(e) => setBibliography(e.target.value)}
                            placeholder="Enter bibliography (optional)"
                            className="bg-white text-black placeholder:text-gray-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-900">Tags (comma-separated)</Label>
                        <Input
                            value={tags.join(', ')}
                            onChange={(e) => handleTagsChange(e.target.value)}
                            placeholder="Enter tags, separated by commas"
                            className="bg-white text-black placeholder:text-gray-500"
                        />
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