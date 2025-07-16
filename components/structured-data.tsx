export function StructuredData() {
    const websiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Iñaki F. Lozano Portfolio',
        description: 'Full Stack Developer specializing in modern web technologies. Passionate about creating efficient, scalable, and user-friendly applications.',
        url: 'https://inakiserver.lat',
        sameAs: [
            'https://inakilozano.com',
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
                urlTemplate: 'https://inakiserver.lat/?search={search_term_string}'
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
        jobTitle: 'Full Stack Developer',
        description: 'Full Stack Developer specializing in modern web technologies including React, Next.js, Node.js, TypeScript, and MongoDB. Passionate about creating efficient, scalable, and user-friendly applications.',
        url: 'https://inakiserver.lat',
        sameAs: [
            'https://inakilozano.com',
            'https://inakilozano.dev'
        ],
        image: 'https://inakiserver.lat/pfp.jpg',
        worksFor: {
            '@type': 'Organization',
            name: 'Freelance Developer'
        },
        knowsAbout: [
            'Full Stack Development',
            'React',
            'Next.js',
            'Node.js',
            'TypeScript',
            'JavaScript',
            'MongoDB',
            'Web Development',
            'Software Engineering',
            'Frontend Development',
            'Backend Development'
        ],
        skills: [
            'React',
            'Next.js',
            'TypeScript',
            'Node.js',
            'MongoDB',
            'PostgreSQL',
            'Docker',
            'AWS',
            'Git',
            'Tailwind CSS'
        ]
    }

    const organizationSchema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Iñaki F. Lozano - Full Stack Developer',
        description: 'Professional full stack development services specializing in modern web technologies.',
        url: 'https://inakiserver.lat',
        sameAs: [
            'https://inakilozano.com',
            'https://inakilozano.dev'
        ],
        logo: 'https://inakiserver.lat/pfp.jpg',
        founder: {
            '@type': 'Person',
            name: 'Iñaki F. Lozano'
        },
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'Professional',
            url: 'https://inakiserver.lat/#contact'
        },
        areaServed: 'Worldwide',
        serviceType: [
            'Web Development',
            'Full Stack Development',
            'Frontend Development',
            'Backend Development',
            'Software Consulting'
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
                item: 'https://inakiserver.lat'
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'About',
                item: 'https://inakiserver.lat/#about'
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: 'Experience',
                item: 'https://inakiserver.lat/#experience'
            },
            {
                '@type': 'ListItem',
                position: 4,
                name: 'Projects',
                item: 'https://inakiserver.lat/#projects'
            },
            {
                '@type': 'ListItem',
                position: 5,
                name: 'Blog',
                item: 'https://inakiserver.lat/#blog'
            },
            {
                '@type': 'ListItem',
                position: 6,
                name: 'Contact',
                item: 'https://inakiserver.lat/#contact'
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