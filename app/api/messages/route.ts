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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const body = await request.json();

        await connectToDatabase();
        const message = await Contact.findByIdAndUpdate(
            id,
            { $set: body },
            { new: true }
        );

        if (!message) {
            return NextResponse.json(
                { error: 'Message not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(message);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to update message' },
            { status: 500 }
        );
    }
} 