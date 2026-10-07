'use server';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BlogModel from '@/models/Blog';
import { normalizeBlogPayload } from '@/lib/blog-normalize';
import {
    assertBlogPayloadCanBeSaved,
    BLOG_DOCUMENT_TOO_LARGE_MESSAGE,
    isBlogPayloadError,
    isMongoDocumentSizeError,
} from '@/lib/blog-payload-guard';
import { notifyBlogSubscribers } from '@/lib/server/blog-newsletter';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request?: Request) {
    try {
        await connectToDatabase();
        const session = await getServerSession(authOptions);
        const query = session?.user?.email ? {} : { published: true };
        const summary = request && new URL(request.url).searchParams.get('view') === 'summary';
        const find = BlogModel.find(query);
        if (summary) find.select('-content -content_en -content_es -footer -footer_en -footer_es -bibliography -bibliography_en -bibliography_es');
        const blogs = await find.sort({ createdAt: -1 }).lean();
        return NextResponse.json(blogs, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
    } catch (error) {
        console.error('Failed to fetch blogs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch blogs' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin(request);
        if (!admin.ok) return admin.response;

        const raw = await request.json();
        const body = normalizeBlogPayload(raw);
        assertBlogPayloadCanBeSaved(body);

        await connectToDatabase();
        const blog = await BlogModel.create(body);

        // If published, notify subscribers in the background. Saving the post is
        // the primary admin action; newsletter delivery must not hold the UI open.
        if (blog?.published) {
            void notifyBlogSubscribers(blog).catch((error) => {
                console.error('Newsletter dispatch failed after blog create:', error);
            });
        }

        return NextResponse.json(blog);
    } catch (error) {
        if (isBlogPayloadError(error)) {
            return NextResponse.json(
                { error: error.message },
                { status: error.status }
            );
        }
        const invalid = validationResponse(error);
        if (invalid) return invalid;
        if (isMongoDocumentSizeError(error)) {
            return NextResponse.json(
                { error: BLOG_DOCUMENT_TOO_LARGE_MESSAGE },
                { status: 413 }
            );
        }
        console.error('Failed to create blog:', error);
        return NextResponse.json(
            { error: 'Failed to create blog' },
            { status: 500 }
        );
    }
}

// Mongoose validation errors name the missing fields; say which, without internals.
function validationResponse(error: unknown) {
    if (!(error instanceof Error) || error.name !== 'ValidationError') return null;
    const fields = Object.keys((error as Error & { errors?: Record<string, unknown> }).errors || {});
    const parts = [...new Set(fields.map((f) => f.replace(/_(en|es)$/, '')).filter((f) => ['title', 'subtitle', 'content'].includes(f)))];
    const label = parts.map((f) => (f === 'content' ? 'body' : f)).join(', ') || 'required fields';
    return NextResponse.json({ error: `Add the ${label} before saving.` }, { status: 400 });
}
