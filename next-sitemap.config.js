/** @type {import('next-sitemap').IConfig} */

// Simple static configuration for now
// Dynamic content will be added via API routes if needed
async function fetchDynamicPaths() {
    console.log('Using static sitemap configuration')
    return { blogs: [], projects: [] }
}

module.exports = {
    siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://inakilozano.com',
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
            }
        ],
        additionalSitemaps: [
            `${process.env.NEXT_PUBLIC_APP_URL || 'https://inakilozano.dev'}/sitemap.xml`
        ]
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

        // Add section anchors
        const sectionPaths = [
            {
                loc: '/#about',
                changefreq: 'monthly',
                priority: 0.8,
                lastmod: new Date().toISOString()
            },
            {
                loc: '/#experience',
                changefreq: 'monthly',
                priority: 0.8,
                lastmod: new Date().toISOString()
            },
            {
                loc: '/#education',
                changefreq: 'monthly',
                priority: 0.8,
                lastmod: new Date().toISOString()
            },
            {
                loc: '/#skills',
                changefreq: 'monthly',
                priority: 0.8,
                lastmod: new Date().toISOString()
            },
            {
                loc: '/#projects',
                changefreq: 'weekly',
                priority: 0.9,
                lastmod: new Date().toISOString()
            },
            {
                loc: '/#blog',
                changefreq: 'weekly',
                priority: 0.9,
                lastmod: new Date().toISOString()
            },
            {
                loc: '/#contact',
                changefreq: 'monthly',
                priority: 0.7,
                lastmod: new Date().toISOString()
            }
        ]

        return [...blogPaths, ...projectPaths, ...sectionPaths]
    }
} 