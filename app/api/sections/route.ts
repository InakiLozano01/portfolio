import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SectionModel, SectionSchema } from '@/models/Section';
import { getCachedSections, clearSectionsCache } from '@/lib/cache';

export async function GET() {
  try {
    await connectToDatabase();
    const sections = await getCachedSections();
    return NextResponse.json(sections);
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