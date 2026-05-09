import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getCachedSections, clearSectionsCache } from '@/lib/cache';
import { SectionModel, SectionSchema } from '@/models/Section';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin-auth';
import { ZodError } from 'zod';

// Configure route segment
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  // During build time, return empty data
  if (process.env.SKIP_DB_DURING_BUILD === 'true') {
    console.log('[MongoDB] Skipping connection during build');
    return NextResponse.json({});
  }

  try {
    const session = await getServerSession(authOptions);
    const isAdminRequest = Boolean(session?.user?.email);

    // Try to find section by title first
    const title = id.charAt(0).toUpperCase() + id.slice(1).toLowerCase();
    console.log('[Sections API] Looking for section with title:', title);

    // Try to get from cache first
    const cachedSections = await getCachedSections(id);
    const sections = Array.isArray(cachedSections)
      ? cachedSections
      : cachedSections
        ? [cachedSections]
        : [];

    if (sections.length > 0) {
      const sectionFromCache = sections.find((section: any) => {
        if (!section || typeof section !== 'object') {
          return false;
        }

        const sectionTitle = typeof section.title === 'string' ? section.title.toLowerCase() : '';
        const matchesTitle = sectionTitle === id.toLowerCase();
        const matchesId = typeof section._id === 'string' && section._id === id;

        return matchesTitle || matchesId;
      }) ?? sections[0];

      if (sectionFromCache) {
        if (!isAdminRequest && sectionFromCache.visible === false) {
          await connectToDatabase();
          const freshSection = await SectionModel.findOne({
            title,
            visible: true
          });

          if (freshSection) {
            await clearSectionsCache();
            console.log('[Sections API] Refreshed section from database after stale cache');
            return NextResponse.json(freshSection);
          }

          return NextResponse.json(
            { error: 'Section not found' },
            { status: 404 }
          );
        }

        console.log('[Sections API] Found section in cache');
        return NextResponse.json(sectionFromCache);
      }
    }

    // If not in cache, connect to MongoDB
    await connectToDatabase();

    // Build query based on admin status
    const visibilityQuery = isAdminRequest ? {} : { visible: true };

    // First try to find by title
    const sectionByTitle = await SectionModel.findOne({ title, ...visibilityQuery });
    if (sectionByTitle) {
      console.log('[Sections API] Found section by title');
      return NextResponse.json(sectionByTitle);
    }

    // If not found by title and the ID looks like a MongoDB ObjectId, try finding by ID
    if (mongoose.Types.ObjectId.isValid(id)) {
      console.log('[Sections API] Looking for section with ID:', id);
      const sectionById = await SectionModel.findOne({
        _id: id,
        ...visibilityQuery
      });
      if (sectionById) {
        console.log('[Sections API] Found section by ID');
        return NextResponse.json(sectionById);
      }
    }

    console.log('[Sections API] Section not found');
    return NextResponse.json(
      { error: 'Section not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('[Sections API] Failed to fetch section:', error);
    return NextResponse.json(
      { error: 'Failed to fetch section' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;

    const body = await request.json();
    const updateData = SectionSchema.partial().parse(body);
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No section fields provided' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Try to update by title first
    const title = id.charAt(0).toUpperCase() + id.slice(1).toLowerCase();
    const sectionByTitle = await SectionModel.findOneAndUpdate(
      { title },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (sectionByTitle) {
      // Clear cache after update
      await clearSectionsCache();
      return NextResponse.json(sectionByTitle);
    }

    // If not found by title and the ID looks like a MongoDB ObjectId, try updating by ID
    if (mongoose.Types.ObjectId.isValid(id)) {
      const sectionById = await SectionModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (sectionById) {
        // Clear cache after update
        await clearSectionsCache();
        return NextResponse.json(sectionById);
      }
    }

    return NextResponse.json(
      { error: 'Section not found' },
      { status: 404 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid section payload' },
        { status: 400 }
      );
    }

    console.error('[Sections API] Failed to update section:', error);
    return NextResponse.json(
      { error: 'Failed to update section' },
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

    // Only allow deletion by valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid section ID' },
        { status: 400 }
      );
    }

    const section = await SectionModel.findByIdAndDelete(id);

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      );
    }

    // Clear cache after deletion
    await clearSectionsCache();

    return NextResponse.json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error('[Sections API] Failed to delete section:', error);
    return NextResponse.json(
      { error: 'Failed to delete section' },
      { status: 500 }
    );
  }
} 
