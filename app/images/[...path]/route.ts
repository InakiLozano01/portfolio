/// <reference types="node" />

import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const IMAGE_ROOT = path.resolve('/app/public/images')

const CONTENT_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

function isSafeImagePath(segments: string[]) {
  if (segments.length === 0 || segments.length > 4) return false
  if (!segments.every((segment) => /^[A-Za-z0-9._-]+$/.test(segment))) return false

  const extension = path.extname(segments[segments.length - 1] || '').toLowerCase()
  return extension in CONTENT_TYPES
}

async function readImage(relativePath: string) {
  const absolutePath = path.resolve(IMAGE_ROOT, relativePath)
  if (!absolutePath.startsWith(`${IMAGE_ROOT}${path.sep}`)) return null

  try {
    const stat = await fs.stat(absolutePath)
    if (!stat.isFile()) return null
    return {
      body: await fs.readFile(absolutePath),
      extension: path.extname(absolutePath).toLowerCase(),
    }
  } catch (error) {
    const code = (error as { code?: unknown }).code
    if (code !== 'ENOENT' && code !== 'ENOTDIR') {
      throw error
    }
  }

  return null
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  const segments = params.path || []

  if (!isSafeImagePath(segments)) {
    return NextResponse.json({ error: 'Invalid image path' }, { status: 400 })
  }

  const relativePath = path.join(...segments)
  const image = await readImage(relativePath)

  if (!image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }

  return new NextResponse(image.body, {
    headers: {
      'Content-Type': CONTENT_TYPES[image.extension] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export async function HEAD(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  const segments = params.path || []

  if (!isSafeImagePath(segments)) {
    return new NextResponse(null, { status: 400 })
  }

  const relativePath = path.join(...segments)
  const image = await readImage(relativePath)

  if (!image) {
    return new NextResponse(null, { status: 404 })
  }

  return new NextResponse(null, {
    headers: {
      'Content-Type': CONTENT_TYPES[image.extension] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
