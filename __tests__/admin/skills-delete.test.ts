import { NextResponse } from 'next/server'
import { DELETE } from '../../app/api/skills/route'
import { requireAdmin } from '../../lib/admin-auth'
import Project from '../../models/Project'
import Skill from '../../models/Skill'

jest.mock('../../lib/admin-auth', () => ({ requireAdmin: jest.fn() }))
jest.mock('../../lib/mongodb', () => ({ connectToDatabase: jest.fn() }))
jest.mock('../../models/Project', () => ({ __esModule: true, default: { countDocuments: jest.fn() } }))
jest.mock('../../models/Skill', () => ({ __esModule: true, default: { findByIdAndDelete: jest.fn() } }))

const id = 'b'.repeat(24)
const request = () => new Request(`http://localhost/api/skills?id=${id}`, { method: 'DELETE' })

beforeEach(() => {
  jest.clearAllMocks()
  ;(requireAdmin as jest.Mock).mockResolvedValue({ ok: true })
})

test('a skill still used by projects is not deleted', async () => {
  ;(Project.countDocuments as jest.Mock).mockResolvedValue(2)
  const response = await DELETE(request())
  expect(response.status).toBe(409)
  expect(Skill.findByIdAndDelete).not.toHaveBeenCalled()
})

test('an unused skill is deleted', async () => {
  ;(Project.countDocuments as jest.Mock).mockResolvedValue(0)
  ;(Skill.findByIdAndDelete as jest.Mock).mockResolvedValue({ _id: id })
  const response = await DELETE(request())
  expect(response.status).toBe(200)
  expect(Skill.findByIdAndDelete).toHaveBeenCalledWith(id)
})

test('deleting requires an admin', async () => {
  ;(requireAdmin as jest.Mock).mockResolvedValue({ ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) })
  const response = await DELETE(request())
  expect(response.status).toBe(401)
})
