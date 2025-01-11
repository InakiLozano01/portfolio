import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Skill from '@/models/Skill';
import { getFromCache, setInCache, invalidateCache } from '@/lib/cache';

const SKILLS_CACHE_KEY = 'all_skills';

export async function GET() {
  try {
    // Try to get from cache first
    const cachedSkills = await getFromCache(SKILLS_CACHE_KEY);
    if (cachedSkills) {
      return NextResponse.json(cachedSkills);
    }

    // If not in cache, get from database
    await connectToDatabase();
    const skills = await Skill.find({}).sort({ category: 1, name: 1 });
    
    // Store in cache
    await setInCache(SKILLS_CACHE_KEY, skills);
    
    return NextResponse.json(skills);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await connectToDatabase();
    const skill = await Skill.create(body);
    // Invalidate cache when creating new skill
    await invalidateCache(SKILLS_CACHE_KEY);
    return NextResponse.json(skill);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create skill' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    await connectToDatabase();
    const skill = await Skill.findByIdAndUpdate(body._id, body, { new: true });
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }
    // Invalidate cache when updating skill
    await invalidateCache(SKILLS_CACHE_KEY);
    return NextResponse.json(skill);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update skill' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    await connectToDatabase();
    const skill = await Skill.findByIdAndDelete(id);
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }
    // Invalidate cache when deleting skill
    await invalidateCache(SKILLS_CACHE_KEY);
    return NextResponse.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete skill' }, { status: 500 });
  }
} 