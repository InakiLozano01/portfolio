'use server';

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BlogModel from '@/models/Blog';
import { normalizeBlogPayload } from '@/lib/blog-normalize';
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
        const admin = await requireAdmin(request);
        if (!admin.ok) return admin.response;

        const raw = await request.json();
        const body = normalizeBlogPayload(raw);

        await connectToDatabase();
        const previous = await BlogModel.findById(id).lean();
        const blog = await BlogModel.findByIdAndUpdate(
            id,
            body,
            { new: true, runValidators: true }
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
