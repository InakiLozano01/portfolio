import React from 'react'
import { render, screen } from '@testing-library/react'
import Header from '../../components/Header'

const sections = [
  { id: 'home', label: 'Home', component: () => null },
]

describe('Header component', () => {
  it('renders null when no sections', () => {
    const { container } = render(<Header staticSections={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows brand name when sections provided', () => {
    render(<Header staticSections={sections} />)
    expect(screen.getByText(/Iñaki F\. Lozano/)).toBeInTheDocument()
  })
})
