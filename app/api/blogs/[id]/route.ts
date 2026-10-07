'use server';
import { toUpdate } from '@/lib/update-doc';

import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    if (!id || !id.trim() || !id.match(/^[a-fA-F0-9]{24}$/)) {
        return NextResponse.json(
            { error: 'Invalid blog id' },
            { status: 400 }
        );
    }
    try {
        await connectToDatabase();
        const session = await getServerSession(authOptions);
        const query = session?.user?.email ? { _id: id } : { _id: id, published: true };
        const blog = await BlogModel.findOne(query);

        if (!blog) {
            return NextResponse.json(
                { error: 'Blog not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(blog, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
    } catch (error) {
        console.error('Failed to fetch blog:', error);
        return NextResponse.json(
            { error: 'Failed to fetch blog' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    if (!id || !id.trim() || !id.match(/^[a-fA-F0-9]{24}$/)) {
        return NextResponse.json(
            { error: 'Invalid blog id' },
            { status: 400 }
        );
    }
    try {
        const admin = await requireAdmin(request);
        if (!admin.ok) return admin.response;

        const raw = await request.json();
        const body = normalizeBlogPayload(raw);
        assertBlogPayloadCanBeSaved(body);

        await connectToDatabase();
        const previous = await BlogModel.findById(id).lean();
        const blog = await BlogModel.findByIdAndUpdate(
            id,
            toUpdate(body, raw),
            { new: true, runValidators: true }
        );

        if (!blog) {
            return NextResponse.json(
                { error: 'Blog not found' },
                { status: 404 }
            );
        }

        // Notify subscribers in the background if just published. Saving the post is
        // the primary admin action; newsletter delivery must not hold the UI open.
        if (previous && blog && previous.published === false && blog.published === true) {
            void notifyBlogSubscribers(blog).catch((error) => {
                console.error('Newsletter dispatch failed after blog publish:', error);
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
        console.error('Failed to update blog:', error);
        return NextResponse.json(
            { error: 'Failed to update blog' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    if (!id || !id.trim() || !id.match(/^[a-fA-F0-9]{24}$/)) {
        return NextResponse.json(
            { error: 'Invalid blog id' },
            { status: 400 }
        );
    }
    try {
        const admin = await requireAdmin(request);
        if (!admin.ok) return admin.response;

        await connectToDatabase();
        const blog = await BlogModel.findByIdAndDelete(id);

        if (!blog) {
            return NextResponse.json(
                { error: 'Blog not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: 'Blog deleted successfully' });
    } catch (error) {
        console.error('Failed to delete blog:', error);
        return NextResponse.json(
            { error: 'Failed to delete blog' },
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
