import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

/** Keep CMS originals intact, but send cacheable image URLs in public HTML/RSC. */
export async function externalizeProjectImages(html: string): Promise<string> {
    const embedded = /(<img\b[^>]*?\s+src\s*=\s*)(["'])data:image\/(png|jpeg|webp|avif);base64,([A-Za-z0-9+/=\s]+)\2/gi
    const directory = path.join(process.cwd(), 'public/images/projects/content')
    let result = '', offset = 0
    for (const match of html.matchAll(embedded)) {
        const bytes = Buffer.from(match[4].replace(/\s/g, ''), 'base64')
        if (!bytes.length) continue
        const name = `${createHash('sha256').update(bytes).digest('hex')}.${match[3].toLowerCase()}`
        const file = path.join(directory, name)
        let temporary: string | undefined
        try {
            await fs.mkdir(directory, { recursive: true })
            try {
                await fs.access(file)
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
                // Publish complete files atomically, including concurrent locale renders.
                temporary = `${file}.${randomUUID()}.tmp`
                await fs.writeFile(temporary, bytes)
                await fs.rename(temporary, file)
                temporary = undefined
            }
            result += html.slice(offset, match.index) + `${match[1]}${match[2]}/images/projects/content/${name}${match[2]}`
            offset = match.index + match[0].length
        } catch {
            // A read-only or full image volume must not break existing project content.
            console.warn('Could not externalize a project image; keeping the embedded original')
        } finally {
            if (temporary) await fs.unlink(temporary).catch(() => {})
        }
    }
    return result + html.slice(offset)
}
