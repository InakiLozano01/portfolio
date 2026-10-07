import { ALL_NAV, LEGACY_HASH, isActive } from '../../components/admin/console/nav'

test('every page in the console is reachable from the navigation', () => {
  const hrefs = ALL_NAV.map((item) => item.href)
  for (const path of ['/admin', '/admin/posts', '/admin/projects', '/admin/site', '/admin/skills', '/admin/files', '/admin/inbox', '/admin/comments', '/admin/subscribers', '/admin/invoices', '/admin/settings']) {
    expect(hrefs).toContain(path)
  }
})

test('old hash links map to the new pages', () => {
  expect(LEGACY_HASH.blogs).toBe('/admin/posts')
  expect(LEGACY_HASH.messages).toBe('/admin/inbox')
  expect(LEGACY_HASH.sections).toBe('/admin/site')
  expect(LEGACY_HASH.account).toBe('/admin/settings')
})

test('overview is active only on its own path; other items cover their sub-pages', () => {
  expect(isActive('/admin', '/admin')).toBe(true)
  expect(isActive('/admin/posts', '/admin')).toBe(false)
  expect(isActive('/admin/posts/abc', '/admin/posts')).toBe(true)
  expect(isActive('/admin/postsx', '/admin/posts')).toBe(false)
})
