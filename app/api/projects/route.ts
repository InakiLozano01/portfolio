import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Project from '@/models/Project';
import { getFromCache, setInCache, invalidateCache } from '@/lib/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { normalizeProjectPayload } from '@/lib/project-normalize';
import { optimizeExistingProjectThumbnail } from '@/lib/project-thumbnail-optimization';

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
    // Ensure models are registered, but avoid forcing collection creation in prod
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
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;

    await connectToDatabase();
    const data = normalizeProjectPayload(await request.json());
    const optimizedThumbnail = await optimizeExistingProjectThumbnail(data.thumbnail, data.thumbnailOptimization);
    if (optimizedThumbnail) data.thumbnail = optimizedThumbnail;

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
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;

    const body = await request.json();
    const data = normalizeProjectPayload(body);
    const optimizedThumbnail = await optimizeExistingProjectThumbnail(data.thumbnail, data.thumbnailOptimization);
    if (optimizedThumbnail) data.thumbnail = optimizedThumbnail;
    await connectToDatabase();
    const project = await Project.findByIdAndUpdate(body._id, data, { new: true, runValidators: true });
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
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;

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
