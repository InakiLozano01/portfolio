// Generate branded Open Graph / social share cards (1200x630) for the portfolio.
//
// Produces public/og-en.png and public/og-es.png: navy brand gradient, the IL
// logo mark, name, a localized role line, the domain, and a circular avatar
// (from pfp.jpg). Referenced from app/metadata.ts and the blog page metadata.
//
// Run inside a capped ephemeral container that has the Inter / Source Code Pro
// fonts registered with fontconfig (librsvg needs discoverable fonts):
//
//   docker run --rm --cpus=1 --memory=768m \
//     -v /home/ubuntu/vps/portfolio:/work -w /work node:22-bookworm-slim \
//     sh -c 'apt-get update >/dev/null && apt-get install -y fontconfig >/dev/null && \
//            mkdir -p /usr/share/fonts/truetype/brand && \
//            cp public/fonts/*.ttf /usr/share/fonts/truetype/brand/ && fc-cache -f >/dev/null && \
//            node scripts/generate-og-images.mjs'

import { readFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const PUBLIC = path.join(ROOT, 'public')

const W = 1200
const H = 630

// Brand palette (matches favicons / header / newsletter template).
const NAVY_TL = '#0b1a30'
const NAVY_BR = '#152234'
const INK = '#0c1830'
const WHITE = '#F5F8FC'
const SLATE = '#9DB2C7'
const RED = '#FD4345'
const MAROON = '#800020'
const AMBER = '#FF7A6B'

const LOCALES = {
    en: {
        role1: 'Computation Engineering Student',
        role2: '& Software Developer',
    },
    es: {
        role1: 'Estudiante de Ingeniería en Computación',
        role2: 'y Desarrollador de Software',
    },
}

const NAME = 'Iñaki F. Lozano'
const DOMAIN = 'inakilozano.com'

// Avatar geometry (right side, vertically centered).
const AV_R = 188
const AV_CX = 950
const AV_CY = 315

function escapeXml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function backgroundSvg({ role1, role2 }) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${NAVY_TL}"/>
      <stop offset="1" stop-color="${NAVY_BR}"/>
    </linearGradient>
    <radialGradient id="glowMaroon" cx="0.12" cy="0.9" r="0.7">
      <stop offset="0" stop-color="${MAROON}" stop-opacity="0.38"/>
      <stop offset="1" stop-color="${MAROON}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowAvatar" cx="0.79" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${RED}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${RED}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glowMaroon)"/>
  <rect width="${W}" height="${H}" fill="url(#glowAvatar)"/>

  <!-- left brand accent rail -->
  <rect x="0" y="0" width="10" height="${H}" fill="${RED}"/>

  <!-- avatar backdrop + ring (avatar image composited on top) -->
  <circle cx="${AV_CX}" cy="${AV_CY}" r="${AV_R + 16}" fill="${INK}"/>
  <circle cx="${AV_CX}" cy="${AV_CY}" r="${AV_R + 8}" fill="none" stroke="${RED}" stroke-width="3" stroke-opacity="0.55"/>

  <!-- name -->
  <text x="82" y="322" font-family="Inter" font-weight="700" font-size="78" fill="${WHITE}">${escapeXml(NAME)}</text>
  <!-- accent underline -->
  <rect x="86" y="352" width="104" height="7" rx="3.5" fill="${RED}"/>

  <!-- role (two lines) -->
  <text x="86" y="412" font-family="Inter" font-weight="500" font-size="30" fill="${SLATE}">${escapeXml(role1)}</text>
  <text x="86" y="452" font-family="Inter" font-weight="500" font-size="30" fill="${SLATE}">${escapeXml(role2)}</text>

  <!-- domain -->
  <text x="86" y="556" font-family="Source Code Pro" font-weight="700" font-size="27" fill="${AMBER}">${escapeXml(DOMAIN)}</text>
</svg>`
}

async function circularAvatar() {
    const d = AV_R * 2
    const src = path.join(PUBLIC, 'pfp.jpg')
    const resized = await sharp(src)
        .resize(d, d, { fit: 'cover', position: 'attention' })
        .toBuffer()
    const mask = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}"><circle cx="${AV_R}" cy="${AV_R}" r="${AV_R}" fill="#fff"/></svg>`
    )
    return sharp(resized)
        .composite([{ input: mask, blend: 'dest-in' }])
        .png()
        .toBuffer()
}

async function logoMark() {
    const size = 88
    return sharp(path.join(PUBLIC, 'il-logo-mark.png'))
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
}

async function build(locale) {
    const cfg = LOCALES[locale]
    const base = sharp(Buffer.from(backgroundSvg(cfg)))
    const avatar = await circularAvatar()
    const logo = await logoMark()

    const out = path.join(PUBLIC, `og-${locale}.png`)
    await base
        .composite([
            { input: avatar, left: AV_CX - AV_R, top: AV_CY - AV_R },
            { input: logo, left: 82, top: 74 },
        ])
        .png({ compressionLevel: 9 })
        .toFile(out)
    const meta = await sharp(out).metadata()
    console.log(`wrote ${path.relative(ROOT, out)} (${meta.width}x${meta.height})`)
}

// Read font files eagerly so a missing font fails loudly.
for (const f of ['Inter-Bold.ttf', 'Inter-Medium.ttf', 'SourceCodePro-Bold.ttf']) {
    readFileSync(path.join(PUBLIC, 'fonts', f))
}

await build('en')
await build('es')
console.log('done')
