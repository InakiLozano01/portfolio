/// <reference types="node" />
/// <reference types="sharp" />

import { NextResponse } from 'next/server';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { invalidateCache } from '@/lib/cache';

type AllowedFormats = {
    'image/jpeg': string[];
    'image/png': string[];
    'image/webp': string[];
    'image/avif': string[];
    'image/gif': string[];
    'image/svg+xml': string[];
};

// Define allowed MIME types and their corresponding file extensions
const ALLOWED_FORMATS: AllowedFormats = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
    'image/avif': ['.avif'],
    'image/gif': ['.gif'],
    'image/svg+xml': ['.svg']
};

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            console.error('Upload error: No file provided');
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Log file details
        console.log('File details:', {
            name: file.name,
            type: file.type,
            size: file.size,
            extension: path.extname(file.name).toLowerCase()
        });

        // Check file type
        const fileExtension = path.extname(file.name).toLowerCase();
        const isAllowedMimeType = Object.entries(ALLOWED_FORMATS).some(
            ([mimeType, extensions]) =>
                file.type === mimeType && extensions.includes(fileExtension)
        );

        if (!isAllowedMimeType) {
            console.error('Upload error: Invalid format', {
                providedType: file.type,
                providedExtension: fileExtension,
                allowedFormats: ALLOWED_FORMATS
            });
            return NextResponse.json(
                {
                    error: 'Invalid file format',
                    allowedFormats: Object.keys(ALLOWED_FORMATS).map(mime =>
                        `${mime} (${ALLOWED_FORMATS[mime as keyof AllowedFormats].join(', ')})`
                    )
                },
                { status: 400 }
            );
        }

        try {
            const bytes = await file.arrayBuffer();
            console.log('Successfully read file buffer, size:', bytes.byteLength);

            const buffer = Buffer.from(bytes);
            console.log('Successfully created Buffer from array buffer');

            // Process image with sharp
            const image = sharp(buffer);
            console.log('Successfully initialized Sharp with buffer');

            const metadata = await image.metadata();
            console.log('Image metadata:', metadata);

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
            console.log('Successfully resized image');

            // Generate unique filename
            const filename = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '-')}`;
            const relativePath = `/images/projects/${filename}`;
            const absolutePath = path.join(process.cwd(), 'public', relativePath);

            // Log paths for debugging
            console.log('Paths:', {
                filename,
                relativePath,
                absolutePath,
                cwd: process.cwd()
            });

            // Check if directory exists and is writable
            try {
                await fs.access(path.dirname(absolutePath), fs.constants.W_OK);
                console.log('Directory exists and is writable');
            } catch (error) {
                console.error('Directory access error:', {
                    error,
                    path: path.dirname(absolutePath)
                });
                // Try to create the directory
                await fs.mkdir(path.dirname(absolutePath), { recursive: true });
                console.log('Created directory');

                // Verify directory was created
                try {
                    await fs.access(path.dirname(absolutePath), fs.constants.W_OK);
                    console.log('Verified directory is writable after creation');
                } catch (verifyError: unknown) {
                    const errorMessage = verifyError instanceof Error
                        ? verifyError.message
                        : 'Unknown error while verifying directory';
                    throw new Error(`Failed to create writable directory: ${errorMessage}`);
                }
            }

            // Save the file
            await fs.writeFile(absolutePath, resizedImage);
            console.log('Successfully wrote file to disk');

            // Verify file was written
            try {
                await fs.access(absolutePath, fs.constants.R_OK);
                console.log('Verified file was written successfully');

                // Set appropriate file permissions to ensure readability
                await fs.chmod(absolutePath, 0o644);
                console.log('Set file permissions to 644');
            } catch (verifyError: unknown) {
                const errorMessage = verifyError instanceof Error
                    ? verifyError.message
                    : 'Unknown error while verifying file';
                throw new Error(`Failed to verify file was written: ${errorMessage}`);
            }

            // Get dimensions of the processed image
            const processedMetadata = await sharp(resizedImage).metadata();
            console.log('Final image metadata:', processedMetadata);

            // Invalidate relevant caches after upload
            try {
                // Invalidate projects cache to ensure new images are displayed
                await invalidateCache('projects');
                console.log('Successfully invalidated projects cache');
            } catch (cacheError) {
                console.error('Failed to invalidate cache:', cacheError);
                // Don't fail the request if cache invalidation fails
            }

            return NextResponse.json({
                path: relativePath,
                width: processedMetadata.width,
                height: processedMetadata.height
            });
        } catch (processingError: unknown) {
            console.error('Error during image processing:', {
                error: processingError,
                message: processingError instanceof Error ? processingError.message : 'Unknown error',
                stack: processingError instanceof Error ? processingError.stack : undefined
            });
            if (processingError instanceof Error) {
                throw processingError;
            }
            throw new Error('Unknown error during image processing');
        }
    } catch (error: unknown) {
        console.error('Error processing upload:', {
            error,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            cwd: process.cwd(),
            nodeEnv: process.env.NODE_ENV
        });
        return NextResponse.json(
            {
                error: 'Failed to process upload',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 