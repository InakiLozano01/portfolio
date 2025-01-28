import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Skill from '@/models/Skill';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const headersList = headers();
  console.log('[Skills API] Received GET request from:', headersList.get('user-agent'));
  console.log('[Skills API] Environment:', {
    SKIP_DB_DURING_BUILD: process.env.SKIP_DB_DURING_BUILD,
    NODE_ENV: process.env.NODE_ENV,
    MONGODB_URI: process.env.MONGODB_URI?.split('?')[0] // Log URI without credentials
  });

  // During build time, return empty array
  if (process.env.SKIP_DB_DURING_BUILD === 'true') {
    console.log('[Skills API] Skipping DB during build');
    return NextResponse.json([]);
  }

  try {
    await connectToDatabase();
    console.log('[Skills API] Connected to database');

    const skills = await Skill.find({})
      .sort({ category: 1, proficiency: -1 })
      .lean()
      .exec();

    console.log(`[Skills API] Found ${skills.length} skills`);

    if (!skills || skills.length === 0) {
      console.log('[Skills API] No skills found in database');
      return NextResponse.json([]);
    }

    const response = NextResponse.json(skills);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('[Skills API] Failed to fetch skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await connectToDatabase();

    // Create new skill
    const skill = await Skill.create(body);
    console.log('[Skills API] Created new skill:', skill.name);

    return NextResponse.json(skill);
  } catch (error) {
    console.error('[Skills API] Failed to create skill:', error);
    return NextResponse.json(
      { error: 'Failed to create skill' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (!body._id) {
      return NextResponse.json(
        { error: 'Skill ID is required for updates' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Update existing skill
    const skill = await Skill.findByIdAndUpdate(body._id, body, { new: true });
    if (!skill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    console.log('[Skills API] Updated skill:', skill.name);
    return NextResponse.json(skill);
  } catch (error) {
    console.error('[Skills API] Failed to update skill:', error);
    return NextResponse.json(
      { error: 'Failed to update skill' },
      { status: 500 }
    );
  }
} 