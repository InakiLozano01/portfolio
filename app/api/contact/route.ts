import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Contact from '@/models/Contact';
import { headers } from 'next/headers';

// Rate limit: 5 messages per hour per IP
const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const headersList = headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

    await connectToDatabase();

    // Check rate limit
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW);
    const messageCount = await Contact.countDocuments({
      ipAddress,
      createdAt: { $gte: oneHourAgo }
    });

    if (messageCount >= RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Too many messages. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate input
    if (!body.name || !body.email || !body.message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Create contact message
    const contact = await Contact.create({
      ...body,
      ipAddress
    });

    return NextResponse.json(contact);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    const messages = await Contact.find({})
      .sort({ createdAt: -1 })
      .limit(100); // Limit to last 100 messages
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
} 