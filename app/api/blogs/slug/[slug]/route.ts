'use server';

import { NextResponse } from 'next/server';
import BlogModel from '@/models/Blog';
import { connectToDatabase } from '@/lib/mongodb';

interface RouteParams {
    params: {
        slug: string;
    };
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const blog = await BlogModel.findOne({ slug: params.slug }).lean();

        if (!blog) {
            return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
        }

        return NextResponse.json(blog);
    } catch (error) {
        console.error('Error fetching blog:', error);
        return NextResponse.json(
            { error: 'Failed to fetch blog' },
            { status: 500 }
        );
    }
} 