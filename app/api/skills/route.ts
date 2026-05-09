import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Skill from '@/models/Skill';
import { headers } from 'next/headers';
import { requireAdmin } from '@/lib/admin-auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const legacyMetricFields = [
  'proficiency',
  'yearsOfExperience',
  'yearsExperience',
  'experienceLevel',
  'expertise',
  'expertisePercent',
  'expertisePercentage',
  'percentage',
  'percent',
];

function normalizeSkillPayload(body: Record<string, unknown>) {
  return {
    name: body.name,
    category: body.category,
    icon: body.icon,
  };
}

export async function GET() {
  let userAgent = 'unknown';
  try {
    const headersList = await headers();
    userAgent = headersList.get('user-agent') ?? userAgent;
  } catch {
    // Tests and build-time callers may execute this route outside a request scope.
  }

  console.log('[Skills API] Received GET request from:', userAgent);
  console.log('[Skills API] Environment:', {
    SKIP_DB_DURING_BUILD: process.env.SKIP_DB_DURING_BUILD,
    NODE_ENV: process.env.NODE_ENV,
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
      .select('name category icon createdAt updatedAt')
      .sort({ category: 1, name: 1 })
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
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;

    const body = await request.json();
    await connectToDatabase();

    // Create new skill
    const skill = await Skill.create(normalizeSkillPayload(body));
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
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;

    const body = await request.json();

    if (!body._id) {
      return NextResponse.json(
        { error: 'Skill ID is required for updates' },
        { status: 400 }
      );
    }
    if (!mongoose.isValidObjectId(body._id)) {
      return NextResponse.json(
        { error: 'Invalid skill ID' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Update existing skill
    const skill = await Skill.findByIdAndUpdate(
      body._id,
      {
        $set: {
          ...normalizeSkillPayload(body),
          updatedAt: new Date(),
        },
        $unset: Object.fromEntries(legacyMetricFields.map((field) => [field, ''])),
      },
      { new: true, runValidators: true }
    );
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
