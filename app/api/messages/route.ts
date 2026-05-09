import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Contact from '@/models/Contact';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: Request) {
    try {
        const admin = await requireAdmin(request);
        if (!admin.ok) return admin.response;

        await connectToDatabase();
        const messages = await Contact.find({})
            .sort({ createdAt: -1 })
            .lean();
        return NextResponse.json(messages);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch messages' },
            { status: 500 }
        );
    }
}
