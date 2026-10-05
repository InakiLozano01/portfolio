import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import ClientPage from '../../app/[lang]/client-page'

jest.mock('next/dynamic', () => () => () => null)

const dictionary = { sections: { home: 'Inicio', projects: 'Proyectos', contact: 'Contacto' }, header: {}, footer: {}, languageSwitcher: {} }
const initialSections = ['home', 'projects', 'contact'].map((title, order) => ({
    _id: title, title, order, visible: true,
    content: title === 'contact' ? { email: 'qa@example.test', city: 'Argentina', social: {} } : {},
}))
const scrollIntoView = jest.fn()

beforeEach(() => {
    window.history.replaceState(null, '', '/es')
    Element.prototype.scrollIntoView = scrollIntoView
    scrollIntoView.mockClear()
    window.matchMedia = jest.fn().mockReturnValue({ matches: true })
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({ observe: jest.fn(), disconnect: jest.fn() }))
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callback(0); return 1 })
    global.fetch = jest.fn()
})

afterEach(() => jest.restoreAllMocks())

test('seeded sections render together without re-fetching, and navigation retains the Spanish route', () => {
    render(<ClientPage lang="es" dictionary={dictionary} initialSections={initialSections} initialProjects={[]} initialBlogs={[]} initialYear={2026} />)
    expect(screen.getByRole('region', { name: 'Inicio' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Proyectos' })).toBeVisible()
    expect(fetch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('link', { name: 'Proyectos' }))
    expect(window.location.pathname).toBe('/es')
    expect(window.location.hash).toBe('#projects')
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'instant' })
})

test('initial deep links and history navigation scroll to their section', () => {
    window.history.replaceState(null, '', '/es#projects')
    render(<ClientPage lang="es" dictionary={dictionary} initialSections={initialSections} initialYear={2026} />)
    expect(scrollIntoView.mock.instances.at(-1)).toBe(document.getElementById('projects'))
    act(() => {
        window.history.replaceState(null, '', '/es#home')
        window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(scrollIntoView.mock.instances.at(-1)).toBe(document.getElementById('home'))
})
