import { NextResponse } from 'next/server';
import { clearSectionsCache } from '@/lib/cache';

export async function POST() {
  try {
    clearSectionsCache();
    return NextResponse.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
} 