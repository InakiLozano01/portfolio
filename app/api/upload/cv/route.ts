import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import path from 'path'
import fs from 'fs/promises'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Validate PDF
        if (file.type !== 'application/pdf') {
            return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const absolutePath = path.join(process.cwd(), 'public', 'CV.pdf')

        await fs.writeFile(absolutePath, buffer)
        await fs.chmod(absolutePath, 0o644)

        return NextResponse.json({ path: '/CV.pdf' })
    } catch (error) {
        console.error('Failed to upload CV:', error)
        return NextResponse.json({ error: 'Failed to upload CV' }, { status: 500 })
    }
}


