import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SectionModel, SectionSchema } from '@/models/Section';
import { getCachedSections, clearSectionsCache } from '@/lib/cache';

const isDevelopment = process.env.NODE_ENV !== 'production';

export async function GET() {
  // During build time, return empty array
  if (process.env.SKIP_DB_DURING_BUILD === 'true') {
    console.log('[MongoDB] Skipping connection during build');
    return NextResponse.json([]);
  }

  try {
    // In development, skip cache and fetch directly from DB
    if (isDevelopment) {
      await connectToDatabase();
      const sections = await SectionModel.find().sort({ order: 1 });
      return NextResponse.json(sections);
    }

    // Try to get from cache first
    const sections = await getCachedSections();
    if (sections && sections.length > 0) {
      return NextResponse.json(sections);
    }

    // If not in cache, get from database
    await connectToDatabase();
    const dbSections = await SectionModel.find().sort({ order: 1 });
    return NextResponse.json(dbSections);
  } catch (error) {
    console.error('Failed to fetch sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = SectionSchema.parse(body);
    
    await connectToDatabase();
    const section = await SectionModel.create(validatedData);
    
    // Clear cache after creating new section
    await clearSectionsCache();
    
    return NextResponse.json(section);
  } catch (error) {
    console.error('Failed to create section:', error);
    return NextResponse.json(
      { error: 'Failed to create section' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    await connectToDatabase();

    if (!body._id) {
      return NextResponse.json(
        { error: 'Section ID is required' },
        { status: 400 }
      );
    }

    const section = await SectionModel.findByIdAndUpdate(
      body._id,
      body,
      { new: true }
    );

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      );
    }

    // Clear cache after update
    await clearSectionsCache();

    return NextResponse.json(section);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update section' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    await connectToDatabase();
    const section = await SectionModel.findByIdAndDelete(id);
    
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // Clear cache after deletion
    await clearSectionsCache();

    return NextResponse.json({ message: 'Section deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
} 