/// <reference types="node" />
/// <reference types="sharp" />

import { NextResponse } from 'next/server';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { randomUUID } from 'crypto';
import { invalidateCache } from '@/lib/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

const APP_PUBLIC_IMAGES_DIR = path.resolve('/app/public/images');

async function pathExists(pathToCheck: string) {
    try {
        await fs.access(pathToCheck, fsConstants.R_OK);
        return true;
    } catch {
        return false;
    }
}

async function ensureDirectory(dirPath: string) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
        return true;
    } catch (mkdirError: any) {
        if (mkdirError?.code === 'EEXIST') {
            return true;
        }

        if (mkdirError?.code === 'EACCES') {
            const exists = await pathExists(dirPath);
            if (exists) {
                console.warn('Directory exists but is not writable when ensuring uploads', {
                    dirPath,
                });
                return true;
            }
        }

        console.error('Failed to ensure upload directory exists', {
            dirPath,
            error: mkdirError instanceof Error ? mkdirError.message : mkdirError,
        });
        return false;
    }
}

async function persistImage(targetImagesDir: string, filename: string, data: Buffer) {
    const projectsDir = path.join(targetImagesDir, 'projects');

    const dirReady = await ensureDirectory(projectsDir);
    if (!dirReady) {
        throw new Error(`Upload directory ${projectsDir} is not available`);
    }

    const filePath = path.join(projectsDir, filename);

    try {
        await fs.writeFile(filePath, data);
        try {
            await fs.chmod(filePath, 0o644);
        } catch (chmodError) {
            console.warn('Failed to adjust permissions for uploaded image', {
                filePath,
                error: chmodError instanceof Error ? chmodError.message : chmodError,
            });
        }
        return filePath;
    } catch (writeError) {
        console.error('Failed to write image to disk', {
            filePath,
            error: writeError instanceof Error ? writeError.message : writeError,
        });
        throw writeError;
    }
}

async function ensureSymlink(targetDir: string, linkDir: string) {
    try {
        const stats = await fs.lstat(linkDir);
        if (stats.isSymbolicLink()) {
            const currentTarget = await fs.readlink(linkDir);
            const resolvedTarget = path.resolve(path.dirname(linkDir), currentTarget);
            if (resolvedTarget === targetDir) {
                return true;
            }
            console.warn('Public images symlink points to unexpected target', {
                linkDir,
                currentTarget,
                expected: targetDir,
            });
            return false;
        }

        // Directory already exists as a real folder; leave it in place.
        return false;
    } catch (error: any) {
        if (error?.code !== 'ENOENT') {
            console.error('Failed to inspect existing public images link', {
                linkDir,
                error: error instanceof Error ? error.message : error,
            });
            return false;
        }
    }

    try {
        await fs.mkdir(path.dirname(linkDir), { recursive: true });
        await fs.symlink(targetDir, linkDir, 'dir');
        console.log('Created symlink for public images directory', {
            targetDir,
            linkDir,
        });
        return true;
    } catch (symlinkError) {
        console.error('Failed to create public images symlink', {
            targetDir,
            linkDir,
            error: symlinkError instanceof Error ? symlinkError.message : symlinkError,
        });
        return false;
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
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
            const runtimeImagesDir = path.join(process.cwd(), 'public', 'images');
            const responsePath = path.posix.join('images', 'projects', filename);

            console.log('Upload target resolution', {
                filename,
                runtimeImagesDir,
                appImagesDir: APP_PUBLIC_IMAGES_DIR,
                cwd: process.cwd(),
            });

            const verificationTargets = new Set<string>();
            let persistedSomewhere = false;
            let symlinkActive = false;

            // Attempt to persist inside /app/public/images when available.
            let canonicalFilePath: string | null = null;
            if (await pathExists('/app/public')) {
                try {
                    canonicalFilePath = await persistImage(APP_PUBLIC_IMAGES_DIR, filename, resizedImage);
                    verificationTargets.add(canonicalFilePath);
                    persistedSomewhere = true;
                } catch (canonicalError) {
                    console.error('Failed to persist image in /app/public/images', {
                        error: canonicalError instanceof Error ? canonicalError.message : canonicalError,
                    });
                }
            }

            // When running from the standalone build, try to symlink images into the runtime public directory.
            const runningInStandalone = process.cwd().includes(`${path.sep}.next${path.sep}standalone`);
            if (canonicalFilePath && runningInStandalone) {
                symlinkActive = await ensureSymlink(APP_PUBLIC_IMAGES_DIR, runtimeImagesDir);
                if (symlinkActive) {
                    verificationTargets.add(path.join(runtimeImagesDir, 'projects', filename));
                }
            }

            // Always ensure the runtime public directory has a copy if the symlink is not ready.
            if (!symlinkActive) {
                try {
                    const runtimeFilePath = await persistImage(runtimeImagesDir, filename, resizedImage);
                    verificationTargets.add(runtimeFilePath);
                    persistedSomewhere = true;
                } catch (runtimeError) {
                    console.error('Failed to persist image in runtime public directory', {
                        error: runtimeError instanceof Error ? runtimeError.message : runtimeError,
                    });
                }
            }

            if (!persistedSomewhere) {
                throw new Error('Failed to store uploaded image in any public directory');
            }

            // Verify at least one path is readable.
            for (const targetPath of verificationTargets) {
                try {
                    await fs.access(targetPath, fsConstants.R_OK);
                    console.log('Verified image is readable', { targetPath });
                } catch (verifyError: unknown) {
                    const errorMessage = verifyError instanceof Error
                        ? verifyError.message
                        : 'Unknown error while verifying file readability';
                    throw new Error(`Failed to verify image at ${targetPath}: ${errorMessage}`);
                }
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
                path: `/${responsePath}`,
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
