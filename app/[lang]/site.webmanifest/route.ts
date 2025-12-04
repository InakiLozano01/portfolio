import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const manifestPath = path.join(process.cwd(), 'public', 'site.webmanifest');
        const manifestContent = fs.readFileSync(manifestPath, 'utf-8');

        return new NextResponse(manifestContent, {
            headers: {
                'Content-Type': 'application/manifest+json',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Failed to load manifest:', error);
        return new NextResponse('Not Found', { status: 404 });
    }
}
