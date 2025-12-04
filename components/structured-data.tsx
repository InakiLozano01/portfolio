type StructuredDataProps = {
    lang?: string
    baseUrl: string
    alternateBaseUrl?: string
}

const normalizeBaseUrl = (url: string | undefined) => {
    if (!url) return null
    const trimmed = url.trim()
    if (!trimmed) return null
    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

export function StructuredData({ lang = 'en', baseUrl, alternateBaseUrl }: StructuredDataProps) {
    const isSpanish = lang === 'es'
    const canonicalBase = normalizeBaseUrl(baseUrl) || 'https://inakilozano.com'
    const altBase = normalizeBaseUrl(alternateBaseUrl)
    const sameAs = Array.from(new Set([canonicalBase, altBase].filter(Boolean))) as string[]
    const alternateName = [
        'Iñaki Lozano',
        'Inaki Lozano',
        'Iñaki Fernando Lozano',
        'Inaki Fernando Lozano',
        'Iñaki F. Lozano'
    ]

    const websiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: isSpanish ? 'Portafolio de Iñaki F. Lozano' : 'Iñaki F. Lozano Portfolio',
        description: isSpanish
            ? 'Estudiante de Ingeniería en Computación enfocado en flujos de trabajo de documentos seguros, backends escalables y prácticas modernas de DevOps.'
            : 'Computation Engineering student focused on secure document workflows, scalable backends, and modern DevOps practices.',
        url: canonicalBase,
        inLanguage: isSpanish ? 'es-AR' : 'en-US',
        sameAs,
        alternateName,
        author: {
            '@type': 'Person',
            name: 'Iñaki F. Lozano'
        },
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${canonicalBase}/?search={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
        }
    }

    const personSchema = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'Iñaki F. Lozano',
        givenName: 'Iñaki',
        familyName: 'Lozano',
        jobTitle: isSpanish
            ? 'Estudiante de Ingeniería en Computación y Desarrollador de Software'
            : 'Computation Engineering Student & Software Developer',
        description: isSpanish
            ? 'Investigador y desarrollador trabajando en firmas electrónicas avanzadas, APIs escalables y automatización DevOps.'
            : 'Researcher and developer working on advanced electronic signatures, scalable APIs, and DevOps automation.',
        url: canonicalBase,
        sameAs,
        alternateName,
        image: `${canonicalBase}/pfp.jpg`,
        address: {
            '@type': 'PostalAddress',
            addressLocality: 'Tucumán',
            addressRegion: 'Tucumán',
            addressCountry: 'AR'
        },
        worksFor: {
            '@type': 'Organization',
            name: isSpanish ? 'Tribunal de Cuentas de Tucumán' : 'Court of Accounts of Tucumán',
            address: {
                '@type': 'PostalAddress',
                addressLocality: 'San Miguel de Tucumán',
                addressRegion: 'Tucumán',
                addressCountry: 'AR'
            }
        },
        knowsAbout: isSpanish ? [
            'Firmas Electrónicas Avanzadas',
            'Integridad de Documentos',
            'Desarrollo Backend',
            'Diseño de APIs',
            'DevOps',
            'CI/CD',
            'Implementación en la Nube',
            'Python',
            'Java',
            'Inteligencia Artificial'
        ] : [
            'Advanced Electronic Signatures',
            'Document Integrity',
            'Backend Development',
            'API Design',
            'DevOps',
            'CI/CD',
            'Cloud Deployment',
            'Python',
            'Java',
            'Artificial Intelligence'
        ],
        skills: [
            'Python',
            'Flask',
            'Java',
            'Spring',
            'SQL',
            'JavaScript',
            'React',
            'TypeScript',
            'Docker',
            'Google Cloud Platform',
            'CodeIgniter'
        ]
    }

    const organizationSchema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: isSpanish
            ? 'Iñaki F. Lozano - Desarrollador de Software'
            : 'Iñaki F. Lozano - Software Developer',
        description: isSpanish
            ? 'Flujos de trabajo de documentos seguros, arquitectura backend escalable y automatización DevOps.'
            : 'Secure document workflows, scalable backend architecture, and DevOps automation.',
        url: canonicalBase,
        sameAs,
        alternateName,
        logo: `${canonicalBase}/pfp.jpg`,
        founder: {
            '@type': 'Person',
            name: 'Iñaki F. Lozano'
        },
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: isSpanish ? 'Profesional' : 'Professional',
            url: `${baseUrl}/#contact`,
            availableLanguage: ['Spanish', 'English']
        },
        areaServed: [
            {
                '@type': 'Country',
                name: isSpanish ? 'Argentina' : 'Argentina'
            },
            {
                '@type': 'City',
                name: isSpanish ? 'Tucumán' : 'Tucumán'
            },
            {
                '@type': 'Place',
                name: isSpanish ? 'Internacional' : 'Worldwide'
            }
        ],
        serviceType: isSpanish ? [
            'Soluciones de Firma de Documentos Seguros',
            'Arquitectura Backend',
            'Desarrollo de APIs',
            'Consultoría DevOps',
            'Investigación y Prototipado de Software'
        ] : [
            'Secure Document Signing Solutions',
            'Backend Architecture',
            'API Development',
            'DevOps Consulting',
            'Software Research and Prototyping'
        ]
    }

    // LocalBusiness schema for Argentina/Tucumán SEO
    const localBusinessSchema = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        '@id': `${canonicalBase}/#business`,
        name: isSpanish
            ? 'Iñaki F. Lozano - Desarrollador de Software'
            : 'Iñaki F. Lozano - Software Developer',
        description: isSpanish
            ? 'Servicios de desarrollo de software, arquitectura backend y DevOps en Tucumán, Argentina'
            : 'Software development, backend architecture, and DevOps services in Tucumán, Argentina',
        image: `${canonicalBase}/pfp.jpg`,
        url: canonicalBase,
        telephone: '',
        address: {
            '@type': 'PostalAddress',
            streetAddress: '',
            addressLocality: 'San Miguel de Tucumán',
            addressRegion: 'Tucumán',
            postalCode: '',
            addressCountry: 'AR'
        },
        geo: {
            '@type': 'GeoCoordinates',
            latitude: '-26.8241',
            longitude: '-65.2226'
        },
        areaServed: [
            {
                '@type': 'Country',
                name: 'Argentina'
            },
            {
                '@type': 'State',
                name: 'Tucumán'
            },
            {
                '@type': 'City',
                name: 'San Miguel de Tucumán'
            }
        ],
        priceRange: '$$',
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '5',
            reviewCount: '1'
        }
    }

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: isSpanish ? 'Inicio' : 'Home',
                item: canonicalBase
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: isSpanish ? 'Sobre mí' : 'About',
                item: `${canonicalBase}/#about`
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: isSpanish ? 'Experiencia' : 'Experience',
                item: `${canonicalBase}/#experience`
            },
            {
                '@type': 'ListItem',
                position: 4,
                name: isSpanish ? 'Proyectos' : 'Projects',
                item: `${canonicalBase}/#projects`
            },
            {
                '@type': 'ListItem',
                position: 5,
                name: 'Blog',
                item: `${canonicalBase}/#blog`
            },
            {
                '@type': 'ListItem',
                position: 6,
                name: isSpanish ? 'Contacto' : 'Contact',
                item: `${canonicalBase}/#contact`
            }
        ]
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
        </>
    )
} 
