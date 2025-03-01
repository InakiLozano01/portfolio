import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Project from '@/models/Project';
import Skill from '@/models/Skill';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getFromCache, setInCache, invalidateCache } from '@/lib/cache';

const PROJECTS_CACHE_KEY = 'projects';
const isDevelopment = process.env.NODE_ENV !== 'production';

export async function GET() {
  try {
    // Skip cache in development
    if (!isDevelopment) {
      const cachedProjects = await getFromCache(PROJECTS_CACHE_KEY);
      if (cachedProjects) {
        return NextResponse.json(cachedProjects);
      }
    }

    await connectToDatabase();
    // Ensure Skill model is loaded before using populate
    await Skill.init();
    const projects = await Project.find({})
      .populate('technologies')
      .sort({ createdAt: -1 })
      .lean();

    // Cache the results in production
    if (!isDevelopment) {
      await setInCache(PROJECTS_CACHE_KEY, projects);
    }

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const data = await request.json();

    const project = new Project(data);
    await project.save();

    const savedProject = await Project.findById(project._id)
      .populate('technologies')
      .lean();

    // Invalidate cache after creating new project
    if (!isDevelopment) {
      await invalidateCache(PROJECTS_CACHE_KEY);
    }

    return NextResponse.json(savedProject);
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create project' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    await connectToDatabase();
    const project = await Project.findByIdAndUpdate(body._id, body, { new: true });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Invalidate cache after updating project
    if (!isDevelopment) {
      await invalidateCache(PROJECTS_CACHE_KEY);
    }

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    await connectToDatabase();
    const project = await Project.findByIdAndDelete(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Invalidate cache after deleting project
    if (!isDevelopment) {
      await invalidateCache(PROJECTS_CACHE_KEY);
    }

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
} 