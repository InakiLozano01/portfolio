import { notFound } from 'next/navigation'
import { getDictionary } from '@/lib/dictionary'
import ClientPage from './client-page'

export const dynamicParams = false

export function generateStaticParams() {
    return [{ lang: 'en' }, { lang: 'es' }]
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    if (lang !== 'en' && lang !== 'es') notFound()

    const dictionary = await getDictionary(lang)

    return <ClientPage lang={lang} dictionary={dictionary} />
}
