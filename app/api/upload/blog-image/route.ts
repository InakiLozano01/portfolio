/// <reference types="node" />

import { NextResponse } from 'next/server'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import { constants as fsConstants } from 'fs'
import { randomUUID } from 'crypto'
import { requireAdmin } from '@/lib/admin-auth'

export const runtime = 'nodejs'

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const MAX_BLOG_IMAGE_BYTES = 6 * 1024 * 1024
const MAX_MULTIPART_OVERHEAD_BYTES = 512 * 1024
const MAX_REQUEST_BYTES = MAX_BLOG_IMAGE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES
const MAX_INPUT_PIXELS = 24_000_000
const BLOG_IMAGE_WIDTH = 1600
const BLOG_IMAGE_QUALITY = 82
const APP_BLOG_IMAGES_DIR = path.resolve('/app/public/images/blogs')

function safeBaseName(name: string) {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-')
  return base.replace(/^-|-$/g, '') || 'blog-image'
}

async function ensureDirectory(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true })
  await fs.chmod(dirPath, 0o755).catch(() => undefined)
}

async function writeImage(dirPath: string, filename: string, data: Buffer) {
  await ensureDirectory(dirPath)
  const filePath = path.join(dirPath, filename)
  await fs.writeFile(filePath, data)
  await fs.chmod(filePath, 0o644).catch(() => undefined)
  await fs.access(filePath, fsConstants.R_OK)
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request)
    if (!admin.ok) return admin.response

    const contentLength = Number(request.headers.get('content-length') || 0)
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: 'Image is too large. Maximum size is 6 MB.' }, { status: 413 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    if (file.size > MAX_BLOG_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image is too large. Maximum size is 6 MB.' }, { status: 413 })
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Invalid image format. Use JPEG, PNG, WebP, or AVIF.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const input = Buffer.from(bytes)
    const image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    const metadata = await image.metadata()

    if (!metadata.format || !['jpeg', 'png', 'webp', 'avif'].includes(metadata.format)) {
      return NextResponse.json({ error: 'Invalid image content' }, { status: 400 })
    }

    const pixelCount = (metadata.width || 0) * (metadata.height || 0)
    if (!metadata.width || !metadata.height || pixelCount > MAX_INPUT_PIXELS) {
      return NextResponse.json({ error: 'Image dimensions are too large. Maximum is 24 megapixels.' }, { status: 413 })
    }

    const processed = await image
      .rotate()
      .resize({
        width: BLOG_IMAGE_WIDTH,
        height: BLOG_IMAGE_WIDTH,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: BLOG_IMAGE_QUALITY })
      .toBuffer()

    const filename = `${randomUUID()}-${safeBaseName(file.name)}.webp`
    const runtimeBlogImagesDir = path.join(process.cwd(), 'public', 'images', 'blogs')
    const targets = new Set([APP_BLOG_IMAGES_DIR, runtimeBlogImagesDir])

    let wrote = false
    const failures: string[] = []
    for (const target of targets) {
      try {
        await writeImage(target, filename, processed)
        wrote = true
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error))
      }
    }

    if (!wrote) {
      console.error('Failed to persist blog image', { failures })
      return NextResponse.json({ error: 'Failed to store uploaded image' }, { status: 500 })
    }

    const outputMetadata = await sharp(processed).metadata()

    return NextResponse.json({
      location: `/${path.posix.join('images', 'blogs', filename)}`,
      width: outputMetadata.width,
      height: outputMetadata.height,
    })
  } catch (error) {
    console.error('Failed to upload blog image:', error)
    return NextResponse.json({ error: 'Failed to upload blog image' }, { status: 500 })
  }
}
