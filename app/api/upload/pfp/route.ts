/// <reference types="node" />
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_PROFILE_IMAGE_BYTES = 4 * 1024 * 1024

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin(request)
        if (!admin.ok) return admin.response

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }
        if (file.size > MAX_PROFILE_IMAGE_BYTES) {
            return NextResponse.json({ error: 'Image is too large. Maximum size is 4 MB.' }, { status: 413 })
        }
        if (!ALLOWED.has(file.type)) {
            return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const image = sharp(buffer)
        const metadata = await image.metadata()
        if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
            return NextResponse.json({ error: 'Invalid image content' }, { status: 400 })
        }

        // Ensure it's square and reasonable size
        const processed = await image
            .resize({ width: 512, height: 512, fit: 'cover' })
            .jpeg({ quality: 85 })
            .toBuffer()

        const absolutePath = path.join(process.cwd(), 'public', 'pfp.jpg')
        await fs.writeFile(absolutePath, processed)
        await fs.chmod(absolutePath, 0o644)

        return NextResponse.json({ path: '/pfp.jpg' })
    } catch (error) {
        console.error('Failed to upload profile image:', error)
        return NextResponse.json({ error: 'Failed to upload profile image' }, { status: 500 })
    }
}
