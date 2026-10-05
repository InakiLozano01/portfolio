import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProjectsManager from '../../components/admin/ProjectsManager'
import { ToastProvider } from '../../components/ui/use-toast'
import { clearAdminCache } from '../../lib/admin-fetch'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock('next/dynamic', () => () => function EditorPlaceholder() { return null })

beforeEach(() => {
  localStorage.clear()
  clearAdminCache()
  global.fetch = jest.fn().mockImplementation(async () => Response.json([]))
})

test('an empty saved draft cannot replace the project list with an editor', async () => {
  localStorage.setItem('projectDraft', JSON.stringify({ title: '', description: '', technologies: [] }))
  const view = render(<ToastProvider><ProjectsManager /></ToastProvider>)
  await screen.findByRole('button', { name: /^New Project$/ })
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/projects?view=summary'))
  view.unmount()
  render(<ToastProvider><ProjectsManager /></ToastProvider>)
  await screen.findByRole('button', { name: /^New Project$/ })
  expect((global.fetch as jest.Mock).mock.calls.filter(([url]) => url === '/api/projects?view=summary')).toHaveLength(1)
})

test('existing draft identifiers survive editing with the browser BSON implementation', async () => {
  const projectId = '507f1f77bcf86cd799439011'
  const skillId = '507f191e810c19729de860ea'
  localStorage.setItem('projectDraft', JSON.stringify({ _id: projectId, title: 'Saved draft', subtitle: 'Draft subtitle', technologies: [skillId] }))
  render(<ToastProvider><ProjectsManager /></ToastProvider>)
  await screen.findByRole('button', { name: /^Update Project$/ })
  fireEvent.change(screen.getByRole('textbox', { name: /^Project Title$/ }), { target: { value: 'Edited draft' } })
  await waitFor(() => {
    const draft = JSON.parse(localStorage.getItem('projectDraft') || '{}')
    expect(draft.title).toBe('Edited draft')
    expect(draft._id).toBe(projectId)
    expect(draft.technologies).toEqual([skillId])
  })
})
