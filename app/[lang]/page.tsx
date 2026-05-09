import { notFound } from 'next/navigation'
import { getDictionary } from '@/lib/dictionary'
import { getCachedSections } from '@/lib/cache'
import ClientPage from './client-page'

export const revalidate = 300

async function getInitialSections() {
    if (process.env.SKIP_DB_DURING_BUILD === 'true') return []

    try {
        const sections = await getCachedSections()
        if (!Array.isArray(sections)) return []

        return JSON.parse(JSON.stringify(
            sections
                .filter((section: any) => section?.visible)
                .sort((a: any, b: any) => a.order - b.order),
        ))
    } catch (error) {
        console.error('Failed to load initial sections:', error)
        return []
    }
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    if (lang !== 'en' && lang !== 'es') notFound()

    const [dictionary, initialSections] = await Promise.all([
        getDictionary(lang),
        getInitialSections(),
    ])

    return (
        <ClientPage
            lang={lang}
            dictionary={dictionary}
            initialSections={initialSections}
            initialYear={new Date().getFullYear()}
        />
    )
}
