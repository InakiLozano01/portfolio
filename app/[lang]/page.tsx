import { notFound } from 'next/navigation'
import { getDictionary } from '@/lib/dictionary'
import { getCachedSections } from '@/lib/cache'
import { orderedVisibleSections } from '@/lib/utils'
import { getProjectCards } from '@/lib/projects'
import { getPublishedBlogCards } from '@/lib/blog'
import ClientPage from './client-page'

export const revalidate = 300

async function getInitialSections() {
    if (process.env.SKIP_DB_DURING_BUILD === 'true') return []

    try {
        const sections = await getCachedSections()
        if (!Array.isArray(sections)) return []

        return JSON.parse(JSON.stringify(orderedVisibleSections(sections)))
    } catch (error) {
        console.error('Failed to load initial sections:', error)
        return []
    }
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    if (lang !== 'en' && lang !== 'es') notFound()

    const [dictionary, initialSections, initialProjects, initialBlogs] = await Promise.all([
        getDictionary(lang),
        getInitialSections(),
        getProjectCards(),
        getPublishedBlogCards(),
    ])

    return (
        <ClientPage
            lang={lang}
            dictionary={dictionary}
            initialSections={initialSections}
            initialProjects={initialProjects}
            initialBlogs={initialBlogs}
            initialYear={new Date().getFullYear()}
        />
    )
}
