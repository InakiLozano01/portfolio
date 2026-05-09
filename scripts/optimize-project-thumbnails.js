const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const { spawn } = require('child_process');
const mongoose = require('mongoose');

const quality = clampNumber(process.env.THUMBNAIL_WEBP_QUALITY, 82, 50, 95);
const effort = clampNumber(process.env.THUMBNAIL_WEBP_EFFORT, 4, 0, 6);
const dryRun = process.env.APPLY !== '1';
const publicDir = process.env.PUBLIC_DIR || '/app/public';
const projectImagesRoot = path.resolve(publicDir, 'images/projects');
const ffmpegTimeoutMs = 15000;

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    const stderr = [];
    let settled = false;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) return reject(error);
      resolve();
    };

    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new Error(`ffmpeg timed out after ${ffmpegTimeoutMs}ms`));
    }, ffmpegTimeoutMs);

    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.on('error', finish);
    child.on('close', (code) => {
      if (code === 0) return finish();
      finish(new Error(`ffmpeg exited with code ${code}: ${Buffer.concat(stderr).toString('utf8').slice(-1200)}`));
    });
  });
}

function resolveProjectThumbnail(thumbnail) {
  if (typeof thumbnail !== 'string' || !/^\/images\/projects\/[^/]+\.(jpe?g|png|avif)$/i.test(thumbnail)) {
    return null;
  }

  const sourcePath = path.resolve(publicDir, thumbnail.replace(/^\//, ''));
  if (!sourcePath.startsWith(`${projectImagesRoot}${path.sep}`)) {
    return null;
  }

  const sourceExt = path.extname(sourcePath);
  const outputPath = sourcePath.replace(new RegExp(`${sourceExt.replace('.', '\\.')}$`, 'i'), `-${randomUUID()}.webp`);
  if (!outputPath.startsWith(`${projectImagesRoot}${path.sep}`)) {
    return null;
  }

  return { sourcePath, outputPath };
}

async function optimizeFile(sourcePath, outputPath) {
  await runFfmpeg([
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    sourcePath,
    '-vf',
    "scale='if(gt(iw,1920),1920,iw)':-2",
    '-frames:v',
    '1',
    '-an',
    '-c:v',
    'libwebp',
    '-quality',
    String(quality),
    '-compression_level',
    String(effort),
    '-preset',
    'picture',
    outputPath,
  ]);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const Project = mongoose.models.Project || mongoose.model('Project', new mongoose.Schema({}, { strict: false }));
  const projects = await Project.find({ thumbnail: /^\/images\/projects\/.+\.(jpe?g|png|avif)$/i }).lean();

  console.log(`${dryRun ? 'Dry run' : 'Apply'}: found ${projects.length} project thumbnails to convert`);

  for (const project of projects) {
    const paths = resolveProjectThumbnail(project.thumbnail);
    if (!paths) {
      console.error(`Skipped ${project._id}: invalid thumbnail path`);
      continue;
    }

    const { sourcePath, outputPath } = paths;
    const nextThumbnail = `/${path.relative(publicDir, outputPath).split(path.sep).join('/')}`;

    try {
      await fs.access(sourcePath);
      console.log(`${dryRun ? 'Would convert' : 'Converting'} ${project._id}: ${project.thumbnail} -> ${nextThumbnail}`);

      if (dryRun) continue;

      await optimizeFile(sourcePath, outputPath);
      await fs.chmod(outputPath, 0o644).catch(() => undefined);
      await Project.updateOne(
        { _id: project._id, thumbnail: project.thumbnail },
        {
          $set: {
            thumbnail: nextThumbnail,
            thumbnailOptimization: { enabled: true, quality, effort },
            updatedAt: new Date(),
          },
        },
      );
    } catch (error) {
      console.error(`Skipped ${project._id}: ${error.message}`);
    }
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
