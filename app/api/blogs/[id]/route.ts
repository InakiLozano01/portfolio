'use server';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BlogModel from '@/models/Blog';
import { normalizeBlogPayload } from '@/lib/blog-normalize';
import { notifyBlogSubscribers } from '@/lib/server/blog-newsletter';

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
        const blog = await BlogModel.findById(id);

        if (!blog) {
            return NextResponse.json(
                { error: 'Blog not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(blog);
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
        const raw = await request.json();
        const body = normalizeBlogPayload(raw);

        await connectToDatabase();
        const previous = await BlogModel.findById(id).lean();
        const blog = await BlogModel.findByIdAndUpdate(
            id,
            body,
            { new: true }
        );

        if (!blog) {
            return NextResponse.json(
                { error: 'Blog not found' },
                { status: 404 }
            );
        }

        // Notify subscribers if just published
        if (previous && blog && previous.published === false && blog.published === true) {
            await notifyBlogSubscribers(blog);
        }

        return NextResponse.json(blog);
    } catch (error) {
        console.error('Failed to update blog:', error);
        return NextResponse.json(
            { error: 'Failed to update blog' },
            { status: 500 }
        );
    }
}

export async function DELETE(
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
