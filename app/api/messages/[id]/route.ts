import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Contact from '@/models/Contact';
import { requireAdmin } from '@/lib/admin-auth';

const PRIVATE = { 'Cache-Control': 'private, no-store' };
const isId = (id: string) => /^[a-f0-9]{24}$/i.test(id);

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    try {
        const admin = await requireAdmin(request);
        if (!admin.ok) return admin.response;
        if (!isId(id)) return NextResponse.json({ error: 'Invalid message id' }, { status: 400, headers: PRIVATE });

        // Only the read flag can change; everything else came from the sender.
        const body = await request.json().catch(() => null);
        if (typeof body?.read !== 'boolean') {
            return NextResponse.json({ error: 'Send { read: boolean }' }, { status: 400, headers: PRIVATE });
        }

        await connectToDatabase();
        const message = await Contact.findByIdAndUpdate(
            id,
            { $set: { read: body.read } },
            { new: true }
        );

        if (!message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404, headers: PRIVATE });
        }

        return NextResponse.json(message, { headers: PRIVATE });
    } catch (error) {
        console.error('Failed to update message', error);
        return NextResponse.json({ error: 'Failed to update message' }, { status: 500, headers: PRIVATE });
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    try {
        const admin = await requireAdmin(request);
        if (!admin.ok) return admin.response;
        if (!isId(id)) return NextResponse.json({ error: 'Invalid message id' }, { status: 400, headers: PRIVATE });

        await connectToDatabase();
        const deleted = await Contact.findByIdAndDelete(id);
        if (!deleted) return NextResponse.json({ error: 'Message not found' }, { status: 404, headers: PRIVATE });
        return NextResponse.json({ ok: true }, { headers: PRIVATE });
    } catch (error) {
        console.error('Failed to delete message', error);
        return NextResponse.json({ error: 'Failed to delete message' }, { status: 500, headers: PRIVATE });
    }
}
