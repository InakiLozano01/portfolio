import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import type { ProjectThumbnailOptimization } from '@/lib/project-thumbnail-settings';

const PROJECT_IMAGES_ROOT = '/app/public/images/projects';
const FFMPEG_TIMEOUT_MS = 15000;

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
