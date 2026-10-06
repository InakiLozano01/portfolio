'use client'

import { MotionConfig } from 'framer-motion'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'

const SECTION_ORDER = ['home', 'about', 'education', 'experience', 'skills', 'projects', 'blog', 'contact']

interface DetailShellProps {
    lang: 'en' | 'es'
    dictionary: any
    contact?: Record<string, any> | null
    children: React.ReactNode
}

/** The Synapse frame for pages outside the home page: header links back to home anchors. */
export default function DetailShell({ lang, dictionary, contact = null, children }: DetailShellProps) {
    const sections = SECTION_ORDER.map((id) => ({ id, label: dictionary?.sections?.[id] || id }))
    return (
        <MotionConfig reducedMotion="user">
        <div className="synapse min-h-screen">
            <SiteHeader
                staticSections={sections}
                dictionary={dictionary?.header}
                languageSwitcherDict={dictionary?.languageSwitcher}
                lang={lang}
                linkOnly
            />
            <main id="content" tabIndex={-1} className="field-cream relative focus:outline-none">
                {children}
            </main>
            <SiteFooter dictionary={dictionary?.footer} initialContact={contact} lang={lang} />
        </div>
        </MotionConfig>
    )
}
