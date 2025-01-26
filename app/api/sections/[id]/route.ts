import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getCachedSections, clearSectionsCache } from '@/lib/cache';
import { SectionModel } from '@/models/Section';
import mongoose from 'mongoose';
import { headers } from 'next/headers';

// Configure route segment
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // During build time, return empty data
  if (process.env.SKIP_DB_DURING_BUILD === 'true') {
    console.log('[MongoDB] Skipping connection during build');
    return NextResponse.json({});
  }

  try {
    // Check if request is from admin page
    const headersList = headers();
    const referer = headersList.get('referer') || '';
    const isAdminRequest = referer.includes('/admin');

    // Try to find section by title first
    const title = params.id.charAt(0).toUpperCase() + params.id.slice(1).toLowerCase();
    console.log('[Sections API] Looking for section with title:', title);

    // Try to get from cache first
    const sections = await getCachedSections(params.id);
    if (sections && sections.length > 0) {
      const section = sections[0];
      // Only return visible sections for non-admin requests
      if (!isAdminRequest && !section.visible) {
        return NextResponse.json(
          { error: 'Section not found' },
          { status: 404 }
        );
      }
      console.log('[Sections API] Found section in cache');
      return NextResponse.json(section);
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
    if (mongoose.Types.ObjectId.isValid(params.id)) {
      console.log('[Sections API] Looking for section with ID:', params.id);
      const sectionById = await SectionModel.findOne({
        _id: params.id,
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
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    await connectToDatabase();

    // Try to update by title first
    const title = params.id.charAt(0).toUpperCase() + params.id.slice(1).toLowerCase();
    const sectionByTitle = await SectionModel.findOneAndUpdate(
      { title },
      { $set: body },
      { new: true }
    );

    if (sectionByTitle) {
      // Clear cache after update
      await clearSectionsCache();
      return NextResponse.json(sectionByTitle);
    }

    // If not found by title and the ID looks like a MongoDB ObjectId, try updating by ID
    if (mongoose.Types.ObjectId.isValid(params.id)) {
      const sectionById = await SectionModel.findByIdAndUpdate(
        params.id,
        body,
        { new: true }
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
    console.error('[Sections API] Failed to update section:', error);
    return NextResponse.json(
      { error: 'Failed to update section' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    // Only allow deletion by valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid section ID' },
        { status: 400 }
      );
    }

    const section = await SectionModel.findByIdAndDelete(params.id);

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