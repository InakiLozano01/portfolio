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

const primarySiteUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL || 'https://inakilozano.com')
const alternateSiteUrl =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_ALT_APP_URL) ||
    (primarySiteUrl.includes('dev') ? 'https://inakilozano.com' : 'https://inakilozano.dev')
const spanishHost = primarySiteUrl.includes('inakilozano.com') ? primarySiteUrl : alternateSiteUrl
const englishHost = primarySiteUrl.includes('inakilozano.dev') ? primarySiteUrl : alternateSiteUrl
const uniqueSitemaps = Array.from(new Set([primarySiteUrl, alternateSiteUrl].filter(Boolean))).map(
    (site) => `${site}/sitemap.xml`
)

const normalizePath = (path) => (path.startsWith('/') ? path : `/${path}`)
const buildAlternateRefs = (section) => {
    const hash = section ? `#${section}` : ''
    return [
        { href: `${englishHost}${normalizePath('/en')}${hash}`, hreflang: 'en-US' },
        { href: `${spanishHost}${normalizePath('/es')}${hash}`, hreflang: 'es-AR' },
        { href: `${spanishHost}${normalizePath('/es')}${hash}`, hreflang: 'es-ES' },
        { href: `${englishHost}${normalizePath('/en')}${hash}`, hreflang: 'x-default' }
    ]
}

/** @type {import('next-sitemap').IConfig} */
async function fetchDynamicPaths() {
    console.log('Using static sitemap configuration')
    return { blogs: [], projects: [] }
}

module.exports = {
    siteUrl: primarySiteUrl,
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
        additionalSitemaps: uniqueSitemaps,
        additionalRobotsTxt: ['Host: inakilozano.com']
    },

    // Exclude certain paths
    exclude: [
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

        // Homepage gets highest priority
        if (path === '/') {
            priority = 1.0
            changefreq = 'weekly'
        }

        // Blog section gets high priority
        if (path.includes('#blog')) {
            priority = 0.9
            changefreq = 'weekly'
        }

        // Main sections get good priority
        if (path.includes('#about') || path.includes('#experience') || path.includes('#skills')) {
            priority = 0.8
            changefreq = 'monthly'
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

        const blogPaths = blogs.map(blog => ({
            loc: `/blog/${blog.slug}`,
            changefreq: 'weekly',
            priority: 0.7,
            lastmod: blog.lastmod
        }))

        const projectPaths = projects.map(project => ({
            loc: `/projects/${project.slug}`,
            changefreq: 'monthly',
            priority: 0.6,
            lastmod: project.lastmod
        }))

        // Languages to generate paths for
        const languages = ['en', 'es']
        const languagePaths = []
        const languageAlternateRefs = buildAlternateRefs()

        // Generate language-specific main pages
        languages.forEach(lang => {
            languagePaths.push({
                loc: `/${lang}`,
                changefreq: 'weekly',
                priority: lang === 'es' ? 0.95 : 1.0, // Spanish gets high priority for Argentina
                lastmod: new Date().toISOString(),
                alternateRefs: languageAlternateRefs
            })
        })

        // Add section anchors for each language
        const sections = ['about', 'experience', 'education', 'skills', 'projects', 'blog', 'contact']
        const sectionPaths = []

        languages.forEach(lang => {
            sections.forEach(section => {
                const priority = ['projects', 'blog'].includes(section) ? 0.9 : 0.8
                const pathHash = `#${section}`
                sectionPaths.push({
                    loc: `/${lang}#${section}`,
                    changefreq: ['projects', 'blog'].includes(section) ? 'weekly' : 'monthly',
                    priority: priority,
                    lastmod: new Date().toISOString(),
                    alternateRefs: buildAlternateRefs(section)
                })
            })
        })

        return [...blogPaths, ...projectPaths, ...languagePaths, ...sectionPaths]
    }
}
