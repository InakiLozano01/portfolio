import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Contact from '@/models/Contact';

export async function GET() {
    try {
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
