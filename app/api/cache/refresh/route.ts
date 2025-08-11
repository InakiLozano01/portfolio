import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { clearSectionsCache, invalidateCache } from '@/lib/cache'
import { revalidateTag, revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

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
                revalidatePath('/projects')
                revalidatePath('/blog')
                break

            case 'projects':
                await invalidateCache('projects')
                revalidatePath('/projects')
                revalidateTag('projects')
                break

            case 'sections':
                await clearSectionsCache()
                revalidatePath('/', 'layout')
                revalidateTag('sections')
                break

            case 'skills':
                await invalidateCache('skills')
                revalidateTag('skills')
                break

            case 'blogs':
                await invalidateCache('blogs')
                revalidatePath('/blog')
                revalidateTag('blogs')
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
            { error: error instanceof Error ? error.message : 'Failed to clear cache' },
            { status: 500 }
        )
    }
}
