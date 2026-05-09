import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Project from '@/models/Project'
import { invalidateCache } from '@/lib/cache'
import { requireAdmin } from '@/lib/admin-auth'
import { normalizeProjectPayload } from '@/lib/project-normalize'
import { optimizeExistingProjectThumbnail } from '@/lib/project-thumbnail-optimization'

const PROJECTS_CACHE_KEY = 'projects'
const isDevelopment = process.env.NODE_ENV !== 'production'

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params
    try {
        await connectToDatabase()
        const project = await Project.findById(id)
            .populate('technologies')
            .lean()

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(project)
    } catch (error) {
        console.error('Error fetching project:', error)
        return NextResponse.json(
            { error: 'Failed to fetch project' },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params
    try {
        const admin = await requireAdmin(request)
        if (!admin.ok) return admin.response

        await connectToDatabase()
        const data = normalizeProjectPayload(await request.json())
        const optimizedThumbnail = await optimizeExistingProjectThumbnail(data.thumbnail, data.thumbnailOptimization)
        if (optimizedThumbnail) data.thumbnail = optimizedThumbnail

        const project = await Project.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }
        ).populate('technologies')

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        if (!isDevelopment) {
            await invalidateCache(PROJECTS_CACHE_KEY)
        }

        return NextResponse.json(project)
    } catch (error: any) {
        console.error('Error updating project:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to update project' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params
    try {
        const admin = await requireAdmin(request)
        if (!admin.ok) return admin.response

        await connectToDatabase()
        const project = await Project.findByIdAndDelete(id)

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        if (!isDevelopment) {
            await invalidateCache(PROJECTS_CACHE_KEY)
        }

        return NextResponse.json({ message: 'Project deleted successfully' })
    } catch (error) {
        console.error('Error deleting project:', error)
        return NextResponse.json(
            { error: 'Failed to delete project' },
            { status: 500 }
        )
    }
} 
