import React from 'react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import Footer from '@/components/Footer'
import { StructuredData } from '@/components/structured-data'

const contact = {
    email: 'inakilozano01@gmail.com',
    city: 'San Miguel de Tucumán, Argentina',
    social: {
        github: 'https://github.com/InakiLozano01',
        linkedin: 'https://www.linkedin.com/in/inaki-lozano',
    },
}

describe('legal identity', () => {
    it('links the visible legal name to the localized legal page', () => {
        render(
            <Footer
                lang="es"
                initialContact={contact}
                currentYear={2026}
                dictionary={{
                    copyright: '© {year} Iñaki Fernando Lozano',
                    legalNotice: 'Información legal — Iñaki Fernando Lozano',
                }}
            />
        )

        expect(screen.getByRole('link', { name: /Información legal/i })).toHaveAttribute('href', '/es/legal')
        expect(screen.getByText('© 2026 Iñaki Fernando Lozano')).toBeVisible()
    })

    it('publishes the exact legal name in business structured data', () => {
        const { container } = render(
            <StructuredData lang="en" baseUrl="https://inakilozano.com" />
        )
        const schemas = Array.from(container.querySelectorAll('script')).map((script) =>
            JSON.parse(script.textContent || '{}')
        )

        expect(schemas.find((schema) => schema['@type'] === 'Organization')?.legalName)
            .toBe('Iñaki Fernando Lozano')
        expect(schemas.find((schema) => schema['@type'] === 'LocalBusiness')?.legalName)
            .toBe('Iñaki Fernando Lozano')
    })

    it('identifies Ethos as Iñaki Fernando Lozano’s principal project on the legal page', () => {
        const legalPage = readFileSync(
            path.join(process.cwd(), 'app', '[lang]', 'legal', 'page.tsx'),
            'utf8'
        )

        expect(legalPage).toContain('Ethos is the principal independent product project developed and operated by Iñaki Fernando Lozano.')
        expect(legalPage).toContain('Ethos es el principal proyecto de producto independiente desarrollado y operado por Iñaki Fernando Lozano.')
        expect(legalPage).toContain('href="https://ethos.ar"')
    })
})
