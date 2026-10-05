import { render } from '@testing-library/react'
import { AdminProviders } from '../../app/admin/providers'

jest.mock('next-auth/react', () => ({ SessionProvider: ({ children }: { children: React.ReactNode }) => children }))
jest.mock('../../components/ui/custom-toaster', () => ({ CustomToaster: () => null }))
jest.mock('../../components/ui/sonner', () => ({ Toaster: () => null }))

test('admin theme reaches portals without overwriting the public theme', () => {
  localStorage.setItem('theme', 'dark')
  document.documentElement.className = 'dark'
  const view = render(<AdminProviders><div>Admin</div></AdminProviders>)
  expect(document.documentElement).toHaveAttribute('data-admin-ui')
  expect(document.documentElement.className).toBe('dark')
  expect(localStorage.getItem('theme')).toBe('dark')
  view.unmount()
  expect(document.documentElement).not.toHaveAttribute('data-admin-ui')
  expect(localStorage.getItem('theme')).toBe('dark')
})
