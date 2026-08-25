import { normalizeProjectThumbnailOptimization } from '@/lib/project-thumbnail-settings'

it('always enables project thumbnail compression', () => {
  expect(normalizeProjectThumbnailOptimization({ enabled: false })).toMatchObject({ enabled: true })
})
