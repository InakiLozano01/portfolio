const assert = require('node:assert/strict')
const { test } = require('node:test')
const { mkdtemp, mkdir, writeFile, rm } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { ESLint } = require('eslint')
const nextPlugin = require('@next/eslint-plugin-next')
const { getRootDirs } = require('@next/eslint-plugin-next/dist/utils/get-root-dirs')

test('Next lint resolves directory globs and still rejects internal HTML links', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'portfolio-lint-'))
  try {
    for (const name of ['first', 'second']) {
      await mkdir(path.join(cwd, name, 'pages'), { recursive: true })
      await writeFile(path.join(cwd, name, 'pages', 'about.tsx'), 'export default function About() { return null }')
    }
    await writeFile(path.join(cwd, 'not-a-directory'), '')
    const context = rootDir => ({ cwd, settings: { next: { rootDir } } })
    const expected = ['first', 'second'].map(name => path.join(cwd, name)).sort()
    assert.deepEqual(getRootDirs(context(`${cwd}/{first,second}`)).sort(), expected)
    assert.deepEqual(getRootDirs(context(`${cwd}/*`)).sort(), expected)
    assert.deepEqual(getRootDirs(context([`${cwd}/first`, `${cwd}/second`])).sort(), expected)
    assert.deepEqual(getRootDirs(context(`${cwd}/missing*`)), [])
    assert.deepEqual(getRootDirs({ cwd, settings: {} }), [cwd])

    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [{
        files: ['**/*.jsx'],
        languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { next: nextPlugin },
        settings: { next: { rootDir: `${cwd}/{first,second}` } },
        rules: { 'next/no-html-link-for-pages': 'error' },
      }],
    })
    const [invalid] = await eslint.lintText('const page = <a href="/about">About</a>', { filePath: 'fixture.jsx' })
    assert.equal(invalid.errorCount, 1)
    assert.equal(invalid.messages[0].ruleId, 'next/no-html-link-for-pages')
    const [valid] = await eslint.lintText('const page = <a href="https://example.invalid/about">External</a>', { filePath: 'fixture.jsx' })
    assert.equal(valid.errorCount, 0)
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})
