import { render, screen, waitFor } from '@testing-library/react'
import ProjectsManager from '../../components/admin/ProjectsManager'
import { ToastProvider } from '../../components/ui/use-toast'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock('next/dynamic', () => () => function EditorPlaceholder() { return null })

beforeEach(() => {
  localStorage.clear()
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] })
})

test('an empty saved draft cannot replace the project list with an editor', async () => {
  localStorage.setItem('projectDraft', JSON.stringify({ title: '', description: '', technologies: [] }))
  const view = render(<ToastProvider><ProjectsManager /></ToastProvider>)
  await screen.findByRole('button', { name: 'New Project', exact: true })
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/projects?view=summary'))
  view.unmount()
  render(<ToastProvider><ProjectsManager /></ToastProvider>)
  await screen.findByRole('button', { name: 'New Project', exact: true })
})
