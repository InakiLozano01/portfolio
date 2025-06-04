import React from 'react'
import { render, screen } from '@testing-library/react'
import SkillsManager from '../../components/admin/SkillsManager'

describe('SkillsManager component', () => {
  it('renders Add Skill button', () => {
    render(<SkillsManager skills={[]} onSave={jest.fn()} />)
    expect(screen.getByText(/Add Skill/i)).toBeInTheDocument()
  })
})
