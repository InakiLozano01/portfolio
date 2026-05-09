import { NextResponse } from 'next/server';
import { clearSectionsCache } from '@/lib/cache';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;

    await clearSectionsCache();

    // Revalidate the paths where sections are used
    revalidatePath('/');  // Home page
    revalidatePath('/en');
    revalidatePath('/es');
    revalidatePath('/admin');  // Admin dashboard

    return NextResponse.json({
      success: true,
      message: 'Cache cleared and pages revalidated successfully'
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
