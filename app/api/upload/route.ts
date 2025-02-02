import { NextResponse } from 'next/server';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Process image with sharp
        const image = sharp(buffer);
        const metadata = await image.metadata();

        // Only resize if the image is larger than 1920px wide
        // This maintains aspect ratio and doesn't crop
        const resizedImage = await image
            .resize({
                width: 1920,
                height: undefined,
                withoutEnlargement: true,
                fit: 'inside'
            })
            .toBuffer();

        // Generate unique filename
        const filename = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '-')}`;
        const relativePath = `/images/projects/${filename}`;
        const absolutePath = path.join(process.cwd(), 'public', relativePath);

        // Ensure directory exists
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });

        // Save the file
        await fs.writeFile(absolutePath, resizedImage);

        // Get dimensions of the processed image
        const processedMetadata = await sharp(resizedImage).metadata();

        return NextResponse.json({
            path: relativePath,
            width: processedMetadata.width,
            height: processedMetadata.height
        });
    } catch (error) {
        console.error('Error processing upload:', error);
        return NextResponse.json(
            { error: 'Failed to process upload' },
            { status: 500 }
        );
    }
} 