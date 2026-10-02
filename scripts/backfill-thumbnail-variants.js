/**
 * Backfill the grid variants (thumbnailSmall + thumbnailBlur) for existing
 * projects, generated with sharp from each project's current `thumbnail`.
 *
 * Mirrors scripts/optimize-project-thumbnails.js: dry-run by default, gated on
 * APPLY=1, reads PUBLIC_DIR (default /app/public) and DATABASE_URL. Designed to
 * run inside the capped portfolio container (sharp + mongoose are available
 * there), never on the host shell.
 *
 *   # dry run
 *   docker exec portfolio-portfolio-1 node /app/scripts/backfill-thumbnail-variants.js
 *   # apply
 *   docker exec -e APPLY=1 portfolio-portfolio-1 node /app/scripts/backfill-thumbnail-variants.js
 */
const fs = require('fs/promises');
const path = require('path');
const { rawModel, pool } = require('./postgres-model.cjs');
const sharp = require('sharp');

const dryRun = process.env.APPLY !== '1';
const publicDir = process.env.PUBLIC_DIR || '/app/public';
const projectImagesRoot = path.resolve(publicDir, 'images/projects');

const SMALL_WIDTH = 640;
const SMALL_QUALITY = 70;
const BLUR_WIDTH = 16;
const BLUR_QUALITY = 40;

const thumbnailPattern = /^\/images\/projects\/[A-Za-z0-9._-]+\.(?:jpe?g|png|avif|webp)$/i;

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function resolveVariantPaths(thumbnail) {
  if (typeof thumbnail !== 'string' || !thumbnailPattern.test(thumbnail)) {
    return null;
  }

  const sourceName = path.basename(thumbnail);
  if (sourceName.includes('..') || sourceName.endsWith('-small.webp')) {
    return null;
  }

  const sourcePath = path.resolve(projectImagesRoot, sourceName);
  if (!sourcePath.startsWith(`${projectImagesRoot}${path.sep}`)) {
    return null;
  }

  const baseName = sourceName.slice(0, sourceName.length - path.extname(sourceName).length);
  const smallName = `${baseName}-small.webp`;
  const smallPath = path.resolve(projectImagesRoot, smallName);
  if (!smallPath.startsWith(`${projectImagesRoot}${path.sep}`)) {
    return null;
  }

  return { sourcePath, smallPath, smallPublicPath: `/images/projects/${smallName}` };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  await pool().query('SELECT 1');
  const Project =
    rawModel('Project', 'projects');
  const projects = await Project.find({ thumbnail: thumbnailPattern }).lean();

  console.log(`${dryRun ? 'Dry run' : 'Apply'}: scanning ${projects.length} projects with eligible thumbnails`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const project of projects) {
    if (project.thumbnailSmall && project.thumbnailBlur) {
      skipped++;
      continue;
    }

    const paths = resolveVariantPaths(project.thumbnail);
    if (!paths) {
      console.error(`Skipped ${project._id}: invalid thumbnail path ${project.thumbnail}`);
      failed++;
      continue;
    }

    const { sourcePath, smallPath, smallPublicPath } = paths;

    try {
      if (!(await pathExists(sourcePath))) {
        console.error(`Skipped ${project._id}: source not found ${sourcePath}`);
        failed++;
        continue;
      }

      const input = await fs.readFile(sourcePath);
      const blurBuffer = await sharp(input)
        .resize({ width: BLUR_WIDTH, withoutEnlargement: true })
        .webp({ quality: BLUR_QUALITY })
        .toBuffer();
      const blurDataURL = `data:image/webp;base64,${blurBuffer.toString('base64')}`;

      console.log(
        `${dryRun ? 'Would update' : 'Updating'} ${project._id}: ${project.thumbnail} -> ${smallPublicPath} (blur ${blurDataURL.length}b)`,
      );

      if (dryRun) {
        updated++;
        continue;
      }

      if (!(await pathExists(smallPath))) {
        const smallBuffer = await sharp(input)
          .resize({ width: SMALL_WIDTH, withoutEnlargement: true })
          .webp({ quality: SMALL_QUALITY })
          .toBuffer();
        await fs.writeFile(smallPath, smallBuffer);
        await fs.chmod(smallPath, 0o644).catch(() => undefined);
      }

      await Project.updateOne(
        { _id: project._id },
        {
          $set: {
            thumbnailSmall: smallPublicPath,
            thumbnailBlur: blurDataURL,
            updatedAt: new Date(),
          },
        },
      );
      updated++;
    } catch (error) {
      console.error(`Skipped ${project._id}: ${error.message}`);
      failed++;
    }
  }

  console.log(
    `Done. ${dryRun ? 'Would update' : 'Updated'}: ${updated}, skipped(existing): ${skipped}, failed: ${failed}`,
  );

  await pool().end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
