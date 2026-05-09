import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Contact from '@/models/Contact';
import { requireAdmin } from '@/lib/admin-auth';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;

    const body = await request.json();
    await connectToDatabase();
    
    const contact = await Contact.findByIdAndUpdate(
      id,
      { $set: { read: body.read } },
      { new: true }
    );

    if (!contact) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(contact);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
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

    await connectToDatabase();
    
    const contact = await Contact.findByIdAndDelete(id);

    if (!contact) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Message deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
} 
