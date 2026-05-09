'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import Carousel from '@/components/Carousel'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

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
    initialYear: number
}

function buildUiSections(data: DBSection[], dictionary: any): Section[] {
    return data
        .filter(section => section.visible)
        .sort((a, b) => a.order - b.order)
        .reduce<Section[]>((items, section) => {
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

export default function ClientPage({ lang, dictionary, initialSections, initialYear }: ClientPageProps) {
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
        const hash = window.location.hash.slice(1)
        if (hash && sections.length > 0) {
            const sectionIndex = sections.findIndex(section => section.id === hash)
            if (sectionIndex !== -1) {
                setCurrentIndex(sectionIndex)
            }
        } else if (sections.length > 0) {
            // Reset to first section if no hash
            setCurrentIndex(0)
        }

        const handleHashChange = () => {
            const nextHash = window.location.hash.slice(1)
            const sectionIndex = sections.findIndex(section => section.id === nextHash)
            if (sectionIndex !== -1) {
                setCurrentIndex(sectionIndex)
            }
        }

        window.addEventListener('hashchange', handleHashChange)
        return () => {
            window.removeEventListener('hashchange', handleHashChange)
        }
    }, [sections])

    const updateSection = (newIndex: number) => {
        setCurrentIndex(newIndex)
        const newHash = sections[newIndex]?.id === 'home' ? '' : `#${sections[newIndex]?.id}`
        window.history.pushState(null, '', `${window.location.pathname}${newHash}`)
    }

    const handlePrev = () => {
        const newIndex = currentIndex > 0 ? currentIndex - 1 : sections.length - 1
        updateSection(newIndex)
    }

    const handleNext = () => {
        const newIndex = currentIndex < sections.length - 1 ? currentIndex + 1 : 0
        updateSection(newIndex)
    }

    useEffect(() => {
        const currentSectionId = sections[currentIndex]?.id
        if (!currentSectionId) return

        setTimeout(() => {
            const currentSectionEl = document.getElementById(currentSectionId)
            currentSectionEl?.scrollTo({ top: 0, behavior: 'auto' })
        }, 50)
    }, [currentIndex, sections])

    const getSectionContainerClasses = (id: string) => {
        const basePadding = 'w-full px-4 md:px-8'
        const mobilePadding = id === 'about'
            ? 'pt-4 pb-[calc(12px+env(safe-area-inset-bottom,0px))]'
            : 'pt-16 pb-[calc(20px+env(safe-area-inset-bottom,0px))]'
        const verticalPadding = `${mobilePadding} md:py-12`

        const mobileJustify = id === 'about' ? 'justify-start' : ''
        const desktopJustify = id === 'home' ? 'md:justify-center' : 'md:justify-start'
        const layout = `min-h-[calc(100vh-48px-40px-env(safe-area-inset-bottom,0px))] md:min-h-full flex flex-col pb-safe-area md:pb-0 md:items-stretch ${mobileJustify} ${desktopJustify}`

        let additional = ''
        if (id === 'skills') {
            additional = 'pb-32 md:pb-20'
        } else if (id === 'experience') {
            additional = 'pb-20 md:pb-40'
        }

        return `${basePadding} ${verticalPadding} ${layout} ${additional}`
    }

    const getInnerWrapperClasses = (id: string) => {
        const base = 'w-full max-w-6xl mx-auto'
        if (id === 'about') return `${base} md:px-12`
        return base
    }

    if (loading) return null

    return (
        <div className="flex flex-col min-h-screen md:h-screen md:overflow-hidden bg-[#263547]">
            <Header
                staticSections={sections}
                currentIndex={currentIndex}
                onSectionChange={updateSection}
                dictionary={dictionary.header}
                lang={lang}
            />

            <main id="content" className="flex-grow relative bg-white overflow-hidden">
                <div className="md:absolute md:inset-0">
                    <div className="fixed inset-x-0 top-[48px] bottom-[calc(40px+env(safe-area-inset-bottom,0px))] md:absolute md:inset-0 md:top-0 md:bottom-0 z-0 pointer-events-none">
                        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E5E5" strokeWidth="1.5" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>
                    </div>

                    {sections.length > 1 && (
                        <button
                            className="hidden md:block fixed left-4 top-1/2 -translate-y-1/2 z-20 bg-[#FD4345] hover:bg-[#ff5456] text-white p-4 rounded-full shadow-lg transition-colors"
                            onClick={handlePrev}
                            aria-label={dictionary.common.previous || "Previous section"}
                        >
                            ←
                        </button>
                    )}

                    <div className="h-[calc(100vh-48px-40px-env(safe-area-inset-bottom,0px))] md:h-full md:overflow-hidden z-10">
                        <Carousel currentIndex={currentIndex} onSwipe={updateSection}>
                            {sections.map(({ id, component: Component, content }) => (
                                <section
                                    key={id}
                                    id={id}
                                    className="h-full relative z-10 overflow-y-auto overflow-x-hidden"
                                    style={{ WebkitOverflowScrolling: 'touch' }}
                                >
                                    <div className={getSectionContainerClasses(id)}>
                                        <div className={getInnerWrapperClasses(id)}>
                                            <Component lang={lang} initialContent={content} />
                                        </div>
                                    </div>
                                </section>
                            ))}
                        </Carousel>
                    </div>

                    {sections.length > 1 && (
                        <button
                            className="hidden md:block fixed right-4 top-1/2 -translate-y-1/2 z-20 bg-[#FD4345] hover:bg-[#ff5456] text-white p-4 rounded-full shadow-lg transition-colors"
                            onClick={handleNext}
                            aria-label={dictionary.common.next || "Next section"}
                        >
                            →
                        </button>
                    )}
                </div>
            </main>

            <Footer
                dictionary={dictionary.footer}
                initialContact={sections.find(section => section.id === 'contact')?.content as any}
                currentYear={initialYear}
            />
        </div>
    )
}
