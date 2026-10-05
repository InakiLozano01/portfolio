'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
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
    home: dynamic(() => import('@/components/sections/Home'), { loading: () => null }),
    about: dynamic(() => import('@/components/sections/About'), { loading: () => null }),
    education: dynamic(() => import('@/components/sections/Education'), { loading: () => null }),
    experience: dynamic(() => import('@/components/sections/Experience'), { loading: () => null }),
    skills: dynamic(() => import('@/components/sections/Skills'), { loading: () => null }),
    projects: dynamic(() => import('@/components/sections/Projects'), { loading: () => null }),
    blog: dynamic(() => import('@/components/sections/Blog'), { loading: () => null }),
    contact: dynamic(() => import('@/components/sections/Contact'), { loading: () => null }),
}

interface ClientPageProps {
    lang: 'en' | 'es'
    dictionary: any
    initialSections?: DBSection[]
    initialProjects?: any[]
    initialBlogs?: any[]
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

export default function ClientPage({ lang, dictionary, initialSections, initialProjects, initialBlogs, initialYear }: ClientPageProps) {
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
        <div className="min-h-screen bg-cream text-navy">
            <Header
                staticSections={sections}
                currentIndex={currentIndex}
                onSectionChange={updateSection}
                dictionary={dictionary.header}
                languageSwitcherDict={dictionary.languageSwitcher}
                lang={lang}
            />
            <main id="content" tabIndex={-1}>
                {sections.map(({ id, component: Component, content }, index) => (
                    <section
                        key={id}
                        id={id}
                        aria-label={dictionary.sections[id] || id}
                        className={id === 'home' ? 'bg-navy text-cream' : index % 2 ? 'bg-cream' : 'bg-cream-dark'}
                    >
                        <div className={id === 'home' ? '' : 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'}>
                            <Component
                                lang={lang}
                                initialContent={content}
                                initialProjects={id === 'projects' ? initialProjects : undefined}
                                initialBlogs={id === 'blog' ? initialBlogs : undefined}
                                dictionary={dictionary}
                            />
                        </div>
                    </section>
                ))}
            </main>

            <Footer
                dictionary={dictionary.footer}
                initialContact={sections.find(section => section.id === 'contact')?.content as any}
                currentYear={initialYear}
                lang={lang}
            />
        </div>
    )
}
