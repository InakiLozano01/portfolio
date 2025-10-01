'use server';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BlogModel from '@/models/Blog';
import { normalizeBlogPayload } from '@/lib/blog-normalize';
import { notifyBlogSubscribers } from '@/lib/server/blog-newsletter';

export async function GET() {
    try {
        await connectToDatabase();
        const blogs = await BlogModel.find().sort({ createdAt: -1 }).lean();
        return NextResponse.json(blogs);
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
        const raw = await request.json();
        const body = normalizeBlogPayload(raw);

        await connectToDatabase();
        const blog = await BlogModel.create(body);

        // If published, notify subscribers (best effort)
        if (blog?.published) {
            await notifyBlogSubscribers(blog);
        }

        return NextResponse.json(blog);
    } catch (error) {
        console.error('Failed to create blog:', error);
        return NextResponse.json(
            { error: 'Failed to create blog' },
            { status: 500 }
        );
    }
}
