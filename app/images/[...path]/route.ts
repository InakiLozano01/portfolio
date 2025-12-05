import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { constants as fsConstants } from 'fs'

// In standalone mode, check multiple possible locations for images
const POSSIBLE_ROOTS = [
  '/app/public/images',                          // Docker container path
  path.resolve(process.cwd(), 'public', 'images'), // Standard Next.js path
  path.resolve(process.cwd(), '..', 'public', 'images'), // Standalone relative
]

async function findImagesRoot(): Promise<string> {
  for (const root of POSSIBLE_ROOTS) {
    try {
      await fs.access(root, fsConstants.R_OK)
      return root
    } catch {
      continue
    }
  }
  // Fallback to the standard path
  return path.resolve(process.cwd(), 'public', 'images')
}

let IMAGES_ROOT: string | null = null

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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: pathParam } = await context.params
  const sanitized = sanitizeSegments(Array.isArray(pathParam) ? pathParam : [])
  if (!sanitized) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  // Initialize IMAGES_ROOT lazily
  if (!IMAGES_ROOT) {
    IMAGES_ROOT = await findImagesRoot()
  }

  const absolutePath = path.join(IMAGES_ROOT, ...sanitized)
  const relative = path.relative(IMAGES_ROOT, absolutePath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const exists = await ensureReadable(absolutePath)
  if (!exists) {
    // Log for debugging
    console.error(`[Images API] File not found: ${absolutePath}, IMAGES_ROOT: ${IMAGES_ROOT}`)
    return NextResponse.json({ error: 'Not found', path: absolutePath }, { status: 404 })
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

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const response = await GET(request, context)
  if (response.ok) {
    return new NextResponse(null, {
      status: 200,
      headers: response.headers,
    })
  }
  return response
}
