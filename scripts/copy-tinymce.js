// Copy TinyMCE assets to public/tinymce for client-side loading (works with Turbopack)
const fs = require('fs')
const path = require('path')

async function copy() {
  const source = path.join(__dirname, '..', 'node_modules', 'tinymce')
  const dest = path.join(__dirname, '..', 'public', 'tinymce')

  const ignore = new Set(['readme.md', 'license.txt', 'changelog.txt'])

  async function copyRecursive(src, dst) {
    const entries = await fs.promises.readdir(src, { withFileTypes: true })
    await fs.promises.mkdir(dst, { recursive: true })

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const dstPath = path.join(dst, entry.name)

      if (ignore.has(entry.name.toLowerCase())) {
        continue
      }

      if (entry.isDirectory()) {
        await copyRecursive(srcPath, dstPath)
      } else if (entry.isFile()) {
        await fs.promises.copyFile(srcPath, dstPath)
      }
    }
  }

  await copyRecursive(source, dest)
}

copy().catch((err) => {
  console.error('Failed to copy TinyMCE assets:', err)
  process.exit(1)
})
