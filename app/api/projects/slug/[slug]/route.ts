import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Project from '@/models/Project'

interface Params {
    params: {
        slug: string
    }
}

export async function GET(request: NextRequest, { params }: Params) {
    try {
        await connectToDatabase()
        const project = await Project.findOne({ slug: params.slug })
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