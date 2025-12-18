const normalizeBaseUrl = (url) => {
    if (!url) return ''
    const trimmed = url.trim()
    if (!trimmed) return ''
    const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
    try {
        const parsed = new URL(withProtocol)
        parsed.pathname = ''
        parsed.search = ''
        parsed.hash = ''
        return parsed.toString().replace(/\/$/, '')
    } catch (_error) {
        return ''
    }
}

const siteUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL || 'https://inakilozano.com')

/** @type {import('next-sitemap').IConfig} */
async function fetchDynamicPaths() {
    console.log('Using static sitemap configuration')
    return { blogs: [], projects: [] }
}

module.exports = {
    siteUrl,
    generateRobotsTxt: true,
    generateIndexSitemap: false,

    // Robots.txt configuration
    robotsTxtOptions: {
        policies: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin/', '/api/', '/_next/', '/static/']
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: ['/admin/', '/api/']
            },
            {
                userAgent: 'Bingbot',
                allow: '/',
                disallow: ['/admin/', '/api/']
            },
            {
                userAgent: 'Yandex',
                allow: '/',
                disallow: ['/admin/', '/api/']
            }
        ],
        additionalSitemaps: [],
        additionalRobotsTxt: [`Host: ${new URL(siteUrl).host}`]
    },

    // Exclude certain paths
    exclude: [
        '/admin',
        '/admin/*',
        '/api/*',
        '/_next/*',
        '/static/*',
        '/404',
        '/500',
        '/loading',
        '/error'
    ],

    // Static pages configuration
    transform: async (config, path) => {
        // Default priority and change frequency
        let priority = 0.7
        let changefreq = 'monthly'

        // Language homepages
        if (path === '/en') {
            priority = 1.0
            changefreq = 'weekly'
        } else if (path === '/es') {
            priority = 0.95
            changefreq = 'weekly'
        }

        return {
            loc: path,
            changefreq,
            priority,
            lastmod: new Date().toISOString()
        }
    },

    // Additional paths (will be populated by additionalPaths function)
    additionalPaths: async (config) => {
        const { blogs, projects } = await fetchDynamicPaths()

        const languages = ['en', 'es']

        const languageHomepages = await Promise.all(languages.map((lang) => config.transform(config, `/${lang}`)))

        const blogPaths = blogs.flatMap((blog) =>
            languages.map((lang) => ({
                loc: `/${lang}/blog/${blog.slug}`,
                changefreq: 'weekly',
                priority: 0.7,
                lastmod: blog.lastmod
            }))
        )

        const projectPaths = projects.flatMap((project) =>
            languages.map((lang) => ({
                loc: `/${lang}/projects/${project.slug}`,
                changefreq: 'monthly',
                priority: 0.6,
                lastmod: project.lastmod
            }))
        )

        return [...languageHomepages, ...blogPaths, ...projectPaths]
    }
}
