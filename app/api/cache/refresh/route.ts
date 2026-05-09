import { NextRequest, NextResponse } from 'next/server'
import { clearSectionsCache, invalidateCache } from '@/lib/cache'
import { revalidateTag, revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
    try {
        const admin = await requireAdmin(request)
        if (!admin.ok) return admin.response

        const { cacheType } = await request.json()

        // Clear different cache types based on request
        switch (cacheType) {
            case 'all':
                await Promise.all([
                    clearSectionsCache(),
                    invalidateCache('projects'),
                    invalidateCache('skills'),
                    invalidateCache('blogs'),
                    invalidateCache('messages')
                ])
                // Revalidate all paths
                revalidatePath('/', 'layout')
                revalidatePath('/en')
                revalidatePath('/es')
                revalidatePath('/projects')
                revalidatePath('/blog')
                break

            case 'projects':
                await invalidateCache('projects')
                revalidatePath('/projects')
                revalidateTag('projects', 'max')
                break

            case 'sections':
                await clearSectionsCache()
                revalidatePath('/', 'layout')
                revalidatePath('/en')
                revalidatePath('/es')
                revalidateTag('sections', 'max')
                break

            case 'skills':
                await invalidateCache('skills')
                revalidateTag('skills', 'max')
                break

            case 'blogs':
                await invalidateCache('blogs')
                revalidatePath('/blog')
                revalidateTag('blogs', 'max')
                break

            default:
                return NextResponse.json(
                    { error: 'Invalid cache type' },
                    { status: 400 }
                )
        }

        return NextResponse.json({
            success: true,
            message: `${cacheType === 'all' ? 'All caches' : `${cacheType} cache`} cleared successfully`,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error('Error clearing cache:', error)
        return NextResponse.json(
            { error: 'Failed to clear cache' },
            { status: 500 }
        )
    }
}
