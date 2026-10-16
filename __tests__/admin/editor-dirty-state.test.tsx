import { fireEvent, render, screen } from '@testing-library/react'
import PostEditor from '../../components/admin/pages/PostEditor'
import ProjectEditor from '../../components/admin/pages/ProjectEditor'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('../../components/admin/pages/NewsletterDialog', () => () => null)
jest.mock('../../components/admin/console/data', () => ({
  ...jest.requireActual('../../components/admin/console/data'),
  useConfirm: () => jest.fn(),
  useResource: () => ({ data: [], loading: false }),
}))
jest.mock('../../components/admin/console/editing', () => ({
  ...jest.requireActual('../../components/admin/console/editing'),
  RichText: ({ label, value, onReady, onChange }: {
    label: string
    value: string
    onReady: () => void
    onChange: (value: string) => void
  }) => (
    <div>
      <button onClick={onReady}>Editor ready</button>
      <textarea aria-label={label} value={value} onChange={event => onChange(event.target.value)} />
    </div>
  ),
}))

afterEach(() => {
  jest.restoreAllMocks()
  localStorage.clear()
})

test.each([
  ['post', PostEditor, 'Post body (English)'],
  ['project', ProjectEditor, 'Case study (English)'],
] as const)('%s editor keeps initialization clean and marks later edits as unsaved', (_name, Editor, label) => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(10_000)
  render(<Editor />)
  fireEvent.click(screen.getByRole('button', { name: 'Editor ready' }))
  fireEvent.change(screen.getByLabelText(label), { target: { value: '<p><br></p>' } })
  expect(screen.getByText('All changes saved')).toBeInTheDocument()
  expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()

  now.mockReturnValue(12_000)
  fireEvent.change(screen.getByLabelText(label), { target: { value: '<p>New content</p>' } })
  expect(screen.getByText('Unsaved changes')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Editor ready' }))
  now.mockReturnValue(12_500)
  fireEvent.change(screen.getByLabelText(label), { target: { value: '<p>New content, normalized</p>' } })
  expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
})
