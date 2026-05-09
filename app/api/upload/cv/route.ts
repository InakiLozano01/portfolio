import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import path from 'path'
import fs from 'fs/promises'

const MAX_CV_BYTES = 8 * 1024 * 1024

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin(request)
        if (!admin.ok) return admin.response

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }
        if (file.size > MAX_CV_BYTES) {
            return NextResponse.json({ error: 'PDF is too large. Maximum size is 8 MB.' }, { status: 413 })
        }

        // Validate PDF
        if (file.type !== 'application/pdf') {
            return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        if (buffer.subarray(0, 5).toString('utf8') !== '%PDF-') {
            return NextResponse.json({ error: 'Invalid PDF content' }, { status: 400 })
        }

        const absolutePath = path.join(process.cwd(), 'public', 'CV.pdf')

        await fs.writeFile(absolutePath, buffer)
        await fs.chmod(absolutePath, 0o644)

        return NextResponse.json({ path: '/CV.pdf' })
    } catch (error) {
        console.error('Failed to upload CV:', error)
        return NextResponse.json({ error: 'Failed to upload CV' }, { status: 500 })
    }
}
