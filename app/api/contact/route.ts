import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Contact from '@/models/Contact';
import { getClientIp } from '@/lib/client-ip';
import { hit } from '@/lib/rate-limit';
import { emailService } from '@/lib/email';
import { requireAdmin } from '@/lib/admin-auth';

// Rate limit: 5 messages per hour per IP
const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ipAddress = getClientIp(request);
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : '';
    const email = typeof body?.email === 'string' ? body.email.trim().slice(0, 100) : '';
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 1000) : '';

    if (!hit(`contact:${ipAddress}`, RATE_LIMIT, RATE_LIMIT_WINDOW).ok) {
      return NextResponse.json(
        { error: 'Too many messages. Please try again later.' },
        { status: 429 }
      );
    }

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
    if (!name || !email || !message || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Create contact message
    // Only these fields are accepted; createdAt and read come from the server.
    await Contact.create({ name, email, message, ipAddress });

    // Send email to admin (best-effort, don't block response on failure)
    try {
      await emailService.sendContactEmail({ name, email, message, ipAddress });
    } catch (e) {
      console.error('Contact email sending failed:', e);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  // During build time, return empty array
  if (process.env.SKIP_DB_DURING_BUILD === 'true') {
    console.log('[MongoDB] Skipping connection during build');
    return NextResponse.json([]);
  }

  try {
    await connectToDatabase();
    const messages = await Contact.find({})
      .sort({ createdAt: -1 })
      .limit(100); // Limit to last 100 messages
    return NextResponse.json(messages, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
} 
