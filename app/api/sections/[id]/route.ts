import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getCachedSections, clearSectionsCache } from '@/lib/cache';
import { SectionModel } from '@/models/Section';

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
    // Try to find section by title first from cache
    const title = params.id.charAt(0).toUpperCase() + params.id.slice(1).toLowerCase();
    const sections = await getCachedSections(params.id);
    
    if (sections && sections.length > 0) {
      return NextResponse.json(sections[0]);
    }
    
    // If not in cache, connect to MongoDB and try to find by ID
    await connectToDatabase();
    const sectionById = await SectionModel.findById(params.id);
    
    if (!sectionById) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(sectionById);
  } catch (error) {
    console.error('Failed to fetch section:', error);
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
    
    // If not found by title, try to update by ID
    const sectionById = await SectionModel.findByIdAndUpdate(
      params.id,
      body,
      { new: true }
    );
    
    if (!sectionById) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      );
    }

    // Clear cache after update
    await clearSectionsCache();
    
    return NextResponse.json(sectionById);
  } catch (error) {
    console.error('Failed to update section:', error);
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
    return NextResponse.json(
      { error: 'Failed to delete section' },
      { status: 500 }
    );
  }
} 