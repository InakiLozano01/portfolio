'use server';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BlogModel from '@/models/Blog';
import { normalizeBlogPayload } from '@/lib/blog-normalize';
import { notifyBlogSubscribers } from '@/lib/server/blog-newsletter';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
    try {
        await connectToDatabase();
        const session = await getServerSession(authOptions);
        const query = session?.user?.email ? {} : { published: true };
        const blogs = await BlogModel.find(query).sort({ createdAt: -1 }).lean();
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
        const admin = await requireAdmin(request);
        if (!admin.ok) return admin.response;

        const raw = await request.json();
        const body = normalizeBlogPayload(raw);

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
        console.error('Failed to create blog:', error);
        return NextResponse.json(
            { error: 'Failed to create blog' },
            { status: 500 }
        );
    }
}
