import { NextRequest, NextResponse } from 'next/server'
import { getProjectBySlug } from '@/lib/projects'

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ slug: string }> }
) {
    const { slug } = await context.params
    try {
        const project = await getProjectBySlug(slug)

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
