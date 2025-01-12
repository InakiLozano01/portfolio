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