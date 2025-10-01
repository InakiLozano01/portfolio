import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { constants as fsConstants } from 'fs'

const IMAGES_ROOT = path.resolve(process.cwd(), 'public', 'images')

const MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  txt: 'text/plain; charset=utf-8',
  json: 'application/json',
}

function resolveContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().replace('.', '')
  return MIME_TYPES[ext] || 'application/octet-stream'
}

function sanitizeSegments(segments: string[]): string[] | null {
  if (!segments.length) return null
  for (const segment of segments) {
    if (!segment || segment.includes('..') || segment.includes('\\')) {
      return null
    }
  }
  return segments
}

async function ensureReadable(filePath: string) {
  try {
    await fs.access(filePath, fsConstants.R_OK)
    return true
  } catch {
    return false
  }
}

export async function GET(_request: NextRequest, { params }: { params: { path?: string[] } }) {
  const sanitized = sanitizeSegments(params.path ?? [])
  if (!sanitized) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const absolutePath = path.join(IMAGES_ROOT, ...sanitized)
  const relative = path.relative(IMAGES_ROOT, absolutePath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const exists = await ensureReadable(absolutePath)
  if (!exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const file = await fs.readFile(absolutePath)
  const contentType = resolveContentType(absolutePath)

  return new NextResponse(file, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

export async function HEAD(request: NextRequest, context: { params: { path?: string[] } }) {
  const response = await GET(request, context)
  if (response.ok) {
    return new NextResponse(null, {
      status: 200,
      headers: response.headers,
    })
  }
  return response
}
