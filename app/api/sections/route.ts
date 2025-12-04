import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SectionModel, SectionSchema, Section } from '@/models/Section';
import { getCachedSections, clearSectionsCache } from '@/lib/cache';
import { headers } from 'next/headers';
import { extractAndSaveSchemas } from '@/lib/schema-extractor';

const isDevelopment = process.env.NODE_ENV !== 'production';

export async function GET() {
  // During build time, return empty array
  if (process.env.SKIP_DB_DURING_BUILD === 'true') {
    console.log('[MongoDB] Skipping connection during build');
    return NextResponse.json([]);
  }

  try {
    // Check if request is from admin page
    const headersList = await headers();
    const referer = headersList.get('referer') || '';
    const isAdminRequest = referer.includes('/admin');

    // Try to get from cache first (even in development)
    const sections = await getCachedSections();

    // If we have cached data, use it
    if (sections && sections.length > 0) {
      // Filter out invisible sections for non-admin requests
      const filteredSections = isAdminRequest ? sections : sections.filter((s: Section) => s.visible);
      return NextResponse.json(filteredSections);
    }

    // If not in cache or cache failed, get from database
    await connectToDatabase();
    const query = isAdminRequest ? {} : { visible: true };
    const dbSections = await SectionModel.find(query).sort({ order: 1 });
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
    // Use flexible validation for creation
    const validatedData = SectionSchema.parse(body);

    await connectToDatabase();
    const section = await SectionModel.create(validatedData);

    // Clear cache after creating new section
    await clearSectionsCache();

    // Update schema file
    if (isDevelopment) {
      await extractAndSaveSchemas();
    }

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

    // Use flexible validation for updates
    const validatedData = SectionSchema.parse(body);
    const section = await SectionModel.findByIdAndUpdate(
      body._id,
      validatedData,
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

    // Update schema file
    if (isDevelopment) {
      await extractAndSaveSchemas();
    }

    return NextResponse.json(section);
  } catch (error) {
    console.error('Failed to update section:', error);
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

    // Update schema file
    if (isDevelopment) {
      await extractAndSaveSchemas();
    }

    return NextResponse.json({ message: 'Section deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
} 
