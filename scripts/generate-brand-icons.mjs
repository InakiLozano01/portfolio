// Generate the full brand-icon set from the source logo (il_new_logo.png).
// Run inside a capped Docker container (see AGENTS.md — no host node):
//   docker run --rm --cpus=1 --memory=512m --memory-swap=512m \
//     -v /home/ubuntu/vps/portfolio:/work -w /work node:22-bookworm-slim \
//     node scripts/generate-brand-icons.mjs
//
// Produces (in public/):
//   - favicon-16/32/48/256, favicon.ico, apple-touch-icon (opaque navy — correct for icons)
//   - android-chrome-192/512 with maskable safe-zone padding
//   - inakilozanodotcomlogo.png (navy 256 — email header, sits in a rounded container)
//   - il-logo-mark.png (transparent white+red mark — site header, floats on dark navy)
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const SRC = 'il_new_logo.png'
const OUT = 'public'
// The baked-in background navy of the source logo (sampled corner) and a tolerance
// for keying it out to transparency for the header mark.
const BG = { r: 10, g: 22, b: 40 } // ~#0a1628
const NAVY = '#0a1628'

const p = (f) => path.join(OUT, f)

// --- opaque square downscales (full-bleed navy) ---
async function square(size, file) {
  await sharp(SRC)
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(p(file))
  return size
}

// --- maskable icon: logo scaled into the central ~80% safe zone on a navy field ---
async function maskable(size, file) {
  const inner = Math.round(size * 0.8)
  const logo = await sharp(SRC).resize(inner, inner, { fit: 'contain', background: NAVY }).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: NAVY } })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(p(file))
}

// --- apple-touch: opaque navy, no rounded corners (iOS rounds them) ---
async function appleTouch() {
  await sharp(SRC).resize(180, 180, { fit: 'cover' }).flatten({ background: NAVY }).png().toFile(p('apple-touch-icon.png'))
}

// --- transparent mark: key out the navy background, feather anti-aliased edges ---
async function transparentMark(size, file) {
  const baseSize = 512
  const { data, info } = await sharp(SRC)
    .resize(baseSize, baseSize, { fit: 'cover' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  // Alpha = smoothstep over colour-distance from the background navy.
  // Background navy -> transparent; white "IL" and red chevron -> opaque; edges feathered.
  const T0 = 38 // <= this distance from navy is fully transparent
  const T1 = 80 // >= this distance is fully opaque
  for (let i = 0; i < width * height; i++) {
    const o = i * channels
    const dr = data[o] - BG.r
    const dg = data[o + 1] - BG.g
    const db = data[o + 2] - BG.b
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)
    let a
    if (dist <= T0) a = 0
    else if (dist >= T1) a = 255
    else a = Math.round(((dist - T0) / (T1 - T0)) * 255)
    data[o + 3] = a
  }
  // Trim the now-transparent margin so the mark fills its box, then re-export at target size.
  const keyed = await sharp(data, { raw: { width, height, channels } })
    .png()
    .toBuffer()
  await sharp(keyed)
    .trim({ threshold: 1 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(p(file))
}

// --- favicon.ico: ICO container embedding PNG entries (16/32/48), widely supported ---
function buildIco(pngs) {
  // pngs: [{ size, buf }]
  const count = pngs.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(count, 4)
  const entries = Buffer.alloc(16 * count)
  let offset = 6 + 16 * count
  const bodies = []
  pngs.forEach((png, idx) => {
    const e = idx * 16
    entries.writeUInt8(png.size >= 256 ? 0 : png.size, e + 0) // width
    entries.writeUInt8(png.size >= 256 ? 0 : png.size, e + 1) // height
    entries.writeUInt8(0, e + 2) // color count
    entries.writeUInt8(0, e + 3) // reserved
    entries.writeUInt16LE(1, e + 4) // planes
    entries.writeUInt16LE(32, e + 6) // bit count
    entries.writeUInt32LE(png.buf.length, e + 8) // bytes in res
    entries.writeUInt32LE(offset, e + 12) // image offset
    offset += png.buf.length
    bodies.push(png.buf)
  })
  return Buffer.concat([header, entries, ...bodies])
}

async function main() {
  const meta = await sharp(SRC).metadata()
  console.log(`source ${SRC}: ${meta.width}x${meta.height} alpha=${meta.hasAlpha}`)

  await square(16, 'favicon-16x16.png')
  await square(32, 'favicon-32x32.png')
  await square(48, 'favicon-48x48.png')
  await square(256, 'favicon-256x256.png')
  await square(256, 'inakilozanodotcomlogo.png')
  await appleTouch()
  await maskable(192, 'android-chrome-192x192.png')
  await maskable(512, 'android-chrome-512x512.png')
  await transparentMark(256, 'il-logo-mark.png')

  const ico = buildIco(await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      buf: await sharp(SRC).resize(size, size, { fit: 'cover' }).png().toBuffer(),
    }))
  ))
  await writeFile(p('favicon.ico'), ico)

  console.log('brand icons generated.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
