const assert = require('node:assert/strict')
const { test } = require('node:test')
const { mkdtemp, writeFile, rm } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const path = require('node:path')
const vm = require('node:vm')
const braces = require('braces')

test('shell quoting rejects line terminators after comment tokens', () => {
  const { quote, parse } = require('shell-quote')
  for (const newline of ['\n', '\r', '\u2028', '\u2029']) {
    assert.throws(() => quote(['echo', 'ok', { comment: 'x' }, `a${newline}echo injected`]), TypeError)
  }
  assert.deepEqual(parse(quote(['echo', 'ordinary space', 'literal;value'])), [
    'echo', 'ordinary space', 'literal;value',
  ])
})

test('removed vulnerable dependencies cannot return through nested installations', () => {
  const { packages } = require('../package-lock.json')
  for (const dependency of ['handlebars', 'sprintf-js']) {
    assert.equal(Object.keys(packages).some(key => key.endsWith(`/node_modules/${dependency}`)
      || key === `node_modules/${dependency}`), false, `${dependency} must remain absent`)
  }
})

function nestedAst(depth) {
  let node = { type: 'text', value: 'a' }
  for (let i = 0; i < depth; i++) node = { type: 'brace', nodes: [node] }
  return { type: 'root', nodes: [node] }
}

test('deep brace, parenthesis and mixed patterns fail before stack exhaustion', () => {
  const patterns = [
    '{'.repeat(4000) + 'a,b' + '}'.repeat(4000),
    '('.repeat(4000) + 'a' + ')'.repeat(4000),
    '{('.repeat(2000) + 'a,b' + ')}'.repeat(2000),
  ]
  for (const pattern of patterns) {
    for (const method of ['parse', 'compile', 'expand', 'stringify']) {
      for (const maxDepth of [undefined, Infinity, NaN, 10000]) {
        assert.throws(() => braces[method](pattern, { maxDepth }), /exceeds max depth/)
      }
    }
  }
})

test('direct AST consumers enforce depth without parsing strings', () => {
  for (const method of ['compile', 'expand', 'stringify']) {
    assert.throws(() => braces[method](nestedAst(4000)), /exceeds max depth/)
    assert.doesNotThrow(() => braces[method](nestedAst(100)))
    const cyclic = { type: 'root', nodes: [] }
    cyclic.nodes.push(cyclic)
    assert.throws(() => braces[method](cyclic), /exceeds max depth/)
  }
})

test('expansion rejects cyclic AST parent links without hanging', () => {
  for (const self of [true, false]) {
    const node = { type: 'paren', nodes: [{ type: 'text', value: 'a' }] }
    node.parent = self ? node : { type: 'paren', parent: node }
    assert.throws(
      () => vm.runInNewContext('braces.expand(node)', { braces, node }, { timeout: 1000 }),
      /parent chain contains a cycle/,
    )
  }
})

test('ordinary glob expansion, escaping, ranges and depth options remain valid', () => {
  assert.deepEqual(braces.expand('src/{app,lib}/**/*.{ts,tsx}'), [
    'src/app/**/*.ts', 'src/app/**/*.tsx', 'src/lib/**/*.ts', 'src/lib/**/*.tsx',
  ])
  assert.deepEqual(braces.expand('file{1..3}'), ['file1', 'file2', 'file3'])
  assert.deepEqual(braces.expand('foo/({a,b})'), ['foo/(a)', 'foo/(b)'])
  assert.equal(braces.compile('a/{b,c}/d'), 'a/(b|c)/d')
  for (const pattern of ['{{a}}', '{a,{b}}', '{{x}y}', '{a,{b,{c}}', '{}{a}']) {
    assert.equal(braces.stringify(braces.parse(pattern), { escapeInvalid: true }), pattern)
  }
  assert.doesNotThrow(() => braces.parse('{a,b}', { maxDepth: 1.5 }))
  assert.throws(() => braces.parse('{{a,b},c}', { maxDepth: 1.5 }), /exceeds max depth/)
  assert.doesNotThrow(() => braces.parse('\\{'.repeat(101)))
  assert.doesNotThrow(() => braces.parse('"' + '{'.repeat(101) + '"'))
})

test('NYC still loads YAML with the replacement parser', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'portfolio-nyc-'))
  try {
    await writeFile(path.join(cwd, '.nycrc.yaml'), 'all: true\ninclude:\n  - src/**/*.ts\n')
    const { loadNycConfig } = require('@istanbuljs/load-nyc-config')
    const config = await loadNycConfig({ cwd })
    assert.equal(config.all, true)
    assert.deepEqual(config.include, ['src/**/*.ts'])
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})
