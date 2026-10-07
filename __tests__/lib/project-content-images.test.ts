import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { externalizeProjectImages } from '../../lib/project-content-images'

let directory: string
const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFe0AAAAASUVORK5CYII=', 'base64')
const embedded = `data:image/png;base64,${bytes.toString('base64')}`

beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'project-images-'))
    jest.spyOn(process, 'cwd').mockReturnValue(directory)
})
afterEach(async () => {
    jest.restoreAllMocks()
    await fs.rm(directory, { recursive: true, force: true })
})

test('serves identical images from concurrent locales as one complete file without changing text', async () => {
    const source = `<p>Project</p><img alt="Diagram" src="${embedded}"><img src='${embedded}'>`
    const results = await Promise.all([externalizeProjectImages(source), externalizeProjectImages(source)])
    expect(results[0]).toBe(results[1])
    expect(results[0]).not.toContain('data:image')
    expect(results[0]).toContain('<p>Project</p><img alt="Diagram"')
    const imageDirectory = path.join(directory, 'public/images/projects/content')
    const files = await fs.readdir(imageDirectory)
    expect(files).toHaveLength(1)
    expect(await fs.readFile(path.join(imageDirectory, files[0]))).toEqual(bytes)
    expect(results[0].split(`/images/projects/content/${files[0]}`)).toHaveLength(3)
    expect(source).toContain(embedded)
    expect(await externalizeProjectImages(results[0])).toBe(results[0])
})

test('preserves unsupported formats and existing image URLs', async () => {
    const html = '<img src="/images/existing.webp"><img src="data:image/svg+xml;base64,PHN2Zy8+">'
    expect(await externalizeProjectImages(html)).toBe(html)
})

test('keeps the original image when storage fails, without leaving a partial file', async () => {
    const html = `<img src="${embedded}">`
    jest.spyOn(fs, 'rename').mockRejectedValue(new Error('read-only'))
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await externalizeProjectImages(html)).toBe(html)
    expect(await fs.readdir(path.join(directory, 'public/images/projects/content'))).toEqual([])
})
