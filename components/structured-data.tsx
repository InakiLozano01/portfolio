export function StructuredData() {
    const websiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Iñaki F. Lozano Portfolio',
        description: 'Computation Engineering student focused on secure document workflows, scalable backends, and modern DevOps practices.',
        url: 'https://inakilozano.com',
        sameAs: [
            'https://inakilozano.dev'
        ],
        author: {
            '@type': 'Person',
            name: 'Iñaki F. Lozano'
        },
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://inakilozano.com/?search={search_term_string}'
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
        jobTitle: 'Computation Engineering Student & Software Developer',
        description: 'Researcher and developer working on advanced electronic signatures, scalable APIs, and DevOps automation.',
        url: 'https://inakilozano.com',
        sameAs: [
            'https://inakilozano.dev'
        ],
        image: 'https://inakilozano.com/pfp.jpg',
        worksFor: {
            '@type': 'Organization',
            name: 'Court of Accounts of Tucumán'
        },
        knowsAbout: [
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
        name: 'Iñaki F. Lozano - Software Developer',
        description: 'Secure document workflows, scalable backend architecture, and DevOps automation.',
        url: 'https://inakilozano.com',
        sameAs: [
            'https://inakilozano.dev'
        ],
        logo: 'https://inakilozano.com/pfp.jpg',
        founder: {
            '@type': 'Person',
            name: 'Iñaki F. Lozano'
        },
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'Professional',
            url: 'https://inakilozano.com/#contact'
        },
        areaServed: 'Worldwide',
        serviceType: [
            'Secure Document Signing Solutions',
            'Backend Architecture',
            'API Development',
            'DevOps Consulting',
            'Software Research and Prototyping'
        ]
    }

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://inakilozano.com'
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'About',
                item: 'https://inakilozano.com/#about'
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: 'Experience',
                item: 'https://inakilozano.com/#experience'
            },
            {
                '@type': 'ListItem',
                position: 4,
                name: 'Projects',
                item: 'https://inakilozano.com/#projects'
            },
            {
                '@type': 'ListItem',
                position: 5,
                name: 'Blog',
                item: 'https://inakilozano.com/#blog'
            },
            {
                '@type': 'ListItem',
                position: 6,
                name: 'Contact',
                item: 'https://inakilozano.com/#contact'
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
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
        </>
    )
} 