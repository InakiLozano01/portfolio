import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Contact from '@/models/Contact';
import { requireAdmin } from '@/lib/admin-auth';

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    try {
        const admin = await requireAdmin(request);
        if (!admin.ok) return admin.response;

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
