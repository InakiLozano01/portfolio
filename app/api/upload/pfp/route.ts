/// <reference types="node" />
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

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
        if (!ALLOWED.has(file.type)) {
            return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const image = sharp(buffer)

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


