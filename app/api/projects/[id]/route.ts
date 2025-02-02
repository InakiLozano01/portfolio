import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Project from '@/models/Project'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface Params {
    params: {
        id: string
    }
}

export async function GET(request: NextRequest, { params }: Params) {
    try {
        await connectToDatabase()
        const project = await Project.findById(params.id)
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

export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        await connectToDatabase()
        const data = await request.json()

        const project = await Project.findByIdAndUpdate(
            params.id,
            { $set: data },
            { new: true }
        ).populate('technologies')

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
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

export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        await connectToDatabase()
        const project = await Project.findByIdAndDelete(params.id)

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
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