import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import type { ProjectThumbnailOptimization } from '@/lib/project-thumbnail-settings';

const PROJECT_IMAGES_ROOT = '/app/public/images/projects';
const FFMPEG_TIMEOUT_MS = 15000;

// Grid-variant tuning. The large ffmpeg-produced webp stays at 1920px for the
// detail page; these lighter sharp-produced variants feed the projects grid.
const SMALL_VARIANT_WIDTH = 640;
const SMALL_VARIANT_QUALITY = 70;
const BLUR_VARIANT_WIDTH = 16;
const BLUR_VARIANT_QUALITY = 40;

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    const stderr: Buffer[] = [];
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) {
        reject(error);
        return;
      }
      resolve();
    };

    const timeout = setTimeout(() => {
      ffmpeg.kill('SIGKILL');
      finish(new Error(`ffmpeg timed out after ${FFMPEG_TIMEOUT_MS}ms`));
    }, FFMPEG_TIMEOUT_MS);

    ffmpeg.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    ffmpeg.on('error', (error) => finish(error));
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        finish();
        return;
      }
      finish(new Error(`ffmpeg exited with code ${code}: ${Buffer.concat(stderr).toString('utf8').slice(-1200)}`));
    });
  });
}

export async function optimizeProjectThumbnailToWebp(
  input: Buffer,
  settings: ProjectThumbnailOptimization,
) {
  const id = randomUUID();
  const inputPath = path.join('/tmp', `${id}-project-thumbnail-input`);
  const outputPath = path.join('/tmp', `${id}-project-thumbnail.webp`);

  await fs.writeFile(inputPath, input);
  try {
    await runFfmpeg([
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      inputPath,
      '-vf',
      "scale='if(gt(iw,1920),1920,iw)':-2",
      '-frames:v',
      '1',
      '-an',
      '-c:v',
      'libwebp',
      '-quality',
      String(settings.quality),
      '-compression_level',
      String(settings.effort),
      '-preset',
      'picture',
      outputPath,
    ]);

    return await fs.readFile(outputPath);
  } finally {
    await Promise.all([
      fs.unlink(inputPath).catch(() => undefined),
      fs.unlink(outputPath).catch(() => undefined),
    ]);
  }
}

async function pathExists(pathToCheck: string) {
  try {
    await fs.access(pathToCheck);
    return true;
  } catch {
    return false;
  }
}

export async function optimizeExistingProjectThumbnail(
  thumbnail: string | undefined,
  settings: ProjectThumbnailOptimization,
) {
  if (!settings.enabled || !thumbnail || !thumbnail.startsWith('/images/projects/')) {
    return null;
  }

  if (thumbnail.toLowerCase().endsWith('.webp')) {
    return null;
  }

  const sourceName = path.basename(thumbnail);
  const sourcePath = path.join(PROJECT_IMAGES_ROOT, sourceName);
  if (!(await pathExists(sourcePath))) {
    return null;
  }

  const outputName = `${path.basename(sourceName, path.extname(sourceName))}-${randomUUID()}.webp`;
  const outputPath = path.join(PROJECT_IMAGES_ROOT, outputName);
  const buffer = await fs.readFile(sourcePath);
  const optimized = await optimizeProjectThumbnailToWebp(buffer, settings);
  await fs.writeFile(outputPath, optimized);
  await fs.chmod(outputPath, 0o644).catch(() => undefined);

  return `/images/projects/${outputName}`;
}

export type ProjectThumbnailVariants = {
  thumbnailSmall?: string;
  thumbnailBlur?: string;
};

// Produce the grid variants from an in-memory image buffer (used by the upload
// route, which already has the processed large webp in memory). Uses sharp
// because it is lighter than ffmpeg for static-image encoding and is already a
// dependency. Returns the small webp buffer and a tiny base64 blur data-URL.
export async function generateProjectThumbnailVariantBuffers(input: Buffer) {
  const small = await sharp(input)
    .resize({ width: SMALL_VARIANT_WIDTH, withoutEnlargement: true })
    .webp({ quality: SMALL_VARIANT_QUALITY })
    .toBuffer();

  const blurBuffer = await sharp(input)
    .resize({ width: BLUR_VARIANT_WIDTH, withoutEnlargement: true })
    .webp({ quality: BLUR_VARIANT_QUALITY })
    .toBuffer();

  return {
    small,
    blurDataURL: `data:image/webp;base64,${blurBuffer.toString('base64')}`,
  };
}

// Ensure the small grid variant + blur placeholder exist for a stored thumbnail
// path. Reads the on-disk large image, writes a sibling `<name>-small.webp`
// (only when missing) and computes the blur data-URL. Resilient by design: any
// failure returns `{}` so the caller falls back to the large `thumbnail` and an
// upload/save is never broken.
export async function ensureProjectThumbnailVariants(
  thumbnail: string | undefined,
): Promise<ProjectThumbnailVariants> {
  try {
    if (!thumbnail || !thumbnail.startsWith('/images/projects/')) {
      return {};
    }

    const sourceName = path.basename(thumbnail);
    if (!sourceName || sourceName.includes('..') || sourceName.endsWith('-small.webp')) {
      return {};
    }

    const sourcePath = path.join(PROJECT_IMAGES_ROOT, sourceName);
    if (!(await pathExists(sourcePath))) {
      return {};
    }

    const baseName = sourceName.slice(0, sourceName.length - path.extname(sourceName).length);
    const smallName = `${baseName}-small.webp`;
    const smallPath = path.join(PROJECT_IMAGES_ROOT, smallName);
    const input = await fs.readFile(sourcePath);

    if (!(await pathExists(smallPath))) {
      const small = await sharp(input)
        .resize({ width: SMALL_VARIANT_WIDTH, withoutEnlargement: true })
        .webp({ quality: SMALL_VARIANT_QUALITY })
        .toBuffer();
      await fs.writeFile(smallPath, small);
      await fs.chmod(smallPath, 0o644).catch(() => undefined);
    }

    const blurBuffer = await sharp(input)
      .resize({ width: BLUR_VARIANT_WIDTH, withoutEnlargement: true })
      .webp({ quality: BLUR_VARIANT_QUALITY })
      .toBuffer();

    return {
      thumbnailSmall: `/images/projects/${smallName}`,
      thumbnailBlur: `data:image/webp;base64,${blurBuffer.toString('base64')}`,
    };
  } catch (error) {
    console.warn('Failed to ensure project thumbnail variants', {
      thumbnail,
      error: error instanceof Error ? error.message : error,
    });
    return {};
  }
}
