'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { MotionConfig } from 'framer-motion'
import type { ComponentType } from 'react'
import SiteHeader from '@/components/synapse/SiteHeader'
import SiteFooter from '@/components/synapse/SiteFooter'
import { orderedVisibleSections } from '@/lib/utils'

type SectionComponent = ComponentType<any>

interface Section {
    id: string
    label: string
    component: SectionComponent
    content?: Record<string, any>
}

interface DBSection {
    _id: string
    title: string
    order: number
    visible: boolean
    content: Record<string, any>
}

const sectionComponents: Record<string, SectionComponent> = {
    home: dynamic(() => import('@/components/synapse/HomeHero')),
    about: dynamic(() => import('@/components/synapse/AboutSection')),
    education: dynamic(() => import('@/components/synapse/EducationSection')),
    experience: dynamic(() => import('@/components/synapse/ExperienceSection')),
    skills: dynamic(() => import('@/components/synapse/StackSection')),
    projects: dynamic(() => import('@/components/synapse/ProjectsSection')),
    blog: dynamic(() => import('@/components/synapse/WritingSection')),
    contact: dynamic(() => import('@/components/synapse/ContactSection')),
}

/** Sections that draw edge to edge; the rest sit in the page column. */
const FULL_BLEED = new Set(['home', 'projects'])
/** Colour field per section, by role: navy = the machine, cream/paper = reading, bordeaux = the personal voice. */
const FIELD: Record<string, string> = {
    home: '',
    about: 'field-cream',
    education: 'field-navy',
    experience: 'field-navy',
    skills: 'field-navy',
    projects: 'field-cream',
    blog: 'field-paper',
    contact: 'field-bordeaux',
}

/** Sections drawn on the signal trace; adjacent ones join into one line. */
const TRACE = new Set(['education', 'experience'])

interface ClientPageProps {
    lang: 'en' | 'es'
    dictionary: any
    initialSections?: DBSection[]
    initialProjects?: any[]
    initialBlogs?: any[]
    initialSkills?: any[]
    initialYear: number
}

function buildUiSections(data: DBSection[], dictionary: any): Section[] {
    return orderedVisibleSections(data).reduce<Section[]>((items, section) => {
            const id = section.title.toLowerCase()
            const Component = sectionComponents[id]
            if (!Component) return items

            items.push({
                id,
                label: dictionary.sections[id] || section.title,
                component: Component,
                content: section.content,
            })
            return items
        }, [])
}

export default function ClientPage({ lang, dictionary, initialSections, initialProjects, initialBlogs, initialSkills, initialYear }: ClientPageProps) {
    const seededSections = useMemo(() => initialSections ?? [], [initialSections])
    const hasSeededSections = seededSections.length > 0
    const [currentIndex, setCurrentIndex] = useState(0)
    const [fetchedSections, setFetchedSections] = useState<DBSection[] | null>(null)
    const [loading, setLoading] = useState(!hasSeededSections)
    const sections = useMemo(() => {
        const sourceSections = hasSeededSections ? seededSections : fetchedSections ?? []
        return buildUiSections(sourceSections, dictionary)
    }, [dictionary, fetchedSections, hasSeededSections, seededSections])

    useEffect(() => {
        if (hasSeededSections) {
            return
        }

        const fetchSections = async () => {
            try {
                const response = await fetch('/api/sections')
                if (!response.ok) {
                    throw new Error('Failed to fetch sections')
                }
                const data: DBSection[] = await response.json()

                setFetchedSections(Array.isArray(data) ? data : [])
            } catch (error) {
                console.error('Error fetching sections:', error)
                setFetchedSections([])
            } finally {
                setLoading(false)
            }
        }

        fetchSections()
    }, [hasSeededSections])

    useEffect(() => {
        const followHash = () => {
            const id = window.location.hash.slice(1) || sections[0]?.id
            const index = sections.findIndex(section => section.id === id)
            if (index < 0) return
            setCurrentIndex(index)
            document.getElementById(id)?.scrollIntoView({ behavior: 'instant' })
        }
        const frame = requestAnimationFrame(followHash)
        window.addEventListener('hashchange', followHash)
        window.addEventListener('popstate', followHash)
        return () => {
            cancelAnimationFrame(frame)
            window.removeEventListener('hashchange', followHash)
            window.removeEventListener('popstate', followHash)
        }
    }, [sections])

    useEffect(() => {
        if (!sections.length) return
        // One observer gates every decorative loop; no per-frame React updates.
        const motionObserver = new IntersectionObserver(entries => {
            for (const entry of entries) {
                (entry.target as HTMLElement).dataset.motion = entry.isIntersecting ? 'active' : 'paused'
            }
        })
        const frame = document.querySelector<HTMLElement>('.synapse')
        const visibility = () => {
            if (frame) frame.dataset.pageHidden = String(document.hidden)
        }
        visibility()
        document.addEventListener('visibilitychange', visibility)
        for (const section of sections) {
            const element = document.getElementById(section.id)
            if (element) motionObserver.observe(element)
        }
        return () => {
            motionObserver.disconnect()
            document.removeEventListener('visibilitychange', visibility)
        }
    }, [sections])

    useEffect(() => {
        if (!sections.length) return
        const observer = new IntersectionObserver(entries => {
            const visible = entries.filter(entry => entry.isIntersecting)
                .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))
            if (visible[0]) {
                const index = sections.findIndex(section => section.id === visible[0].target.id)
                if (index >= 0) setCurrentIndex(index)
            }
        }, { rootMargin: '-15% 0px -65% 0px' })
        for (const section of sections) {
            const element = document.getElementById(section.id)
            if (element) observer.observe(element)
        }
        return () => observer.disconnect()
    }, [sections])

    const updateSection = (index: number) => {
        const section = sections[index]
        if (!section) return
        setCurrentIndex(index)
        const hash = section.id === 'home' ? '' : `#${section.id}`
        window.history.pushState(null, '', `${window.location.pathname}${hash}`)
        document.getElementById(section.id)?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        })
    }

    if (loading) return null

    return (
        <MotionConfig reducedMotion="user">
            <div className="synapse min-h-screen">
                <SiteHeader
                    staticSections={sections}
                    currentIndex={currentIndex}
                    onSectionChange={updateSection}
                    dictionary={dictionary.header}
                    languageSwitcherDict={dictionary.languageSwitcher}
                    lang={lang}
                />
                <main id="content" tabIndex={-1} className="focus:outline-none">
                    {sections.map(({ id, component: Component, content }, index) => (
                        <section
                            key={id}
                            id={id}
                            aria-label={dictionary.sections[id] || id}
                            className={`relative overflow-x-clip ${FIELD[id] ?? 'field-cream'}`}
                        >
                            <div className={FULL_BLEED.has(id) ? '' : 'mx-auto max-w-[1400px] px-5 py-20 sm:px-8 md:py-28'}>
                                <Component
                                    lang={lang}
                                    initialContent={content}
                                    initialProjects={id === 'projects' || id === 'home' || id === 'skills' ? initialProjects : undefined}
                                    initialBlogs={id === 'blog' ? initialBlogs : undefined}
                                    initialSkills={id === 'skills' ? initialSkills : undefined}
                                    dictionary={dictionary}
                                    traceTop={TRACE.has(id) && TRACE.has(sections[index - 1]?.id ?? '')}
                                    traceBottom={TRACE.has(id) && TRACE.has(sections[index + 1]?.id ?? '')}
                                />
                            </div>
                        </section>
                    ))}
                </main>

                <SiteFooter
                    dictionary={dictionary.footer}
                    initialContact={sections.find(section => section.id === 'contact')?.content as any}
                    currentYear={initialYear}
                    lang={lang}
                />
            </div>
        </MotionConfig>
    )
}
