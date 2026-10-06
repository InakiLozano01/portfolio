'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { EASE_OUT } from './content'

interface StaticSection {
    id: string
    label: string
}

interface SiteHeaderProps {
    staticSections?: StaticSection[]
    currentIndex?: number
    onSectionChange?: (index: number) => void
    dictionary?: any
    languageSwitcherDict?: any
    lang?: string
    /** On pages other than home, links go to the home page anchors instead of scrolling. */
    linkOnly?: boolean
}

function LanguageToggle({ lang, dict = {} }: { lang: string; dict?: any }) {
    const switchTo = (event: React.MouseEvent<HTMLAnchorElement>, target: 'en' | 'es') => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        const url = new URL(window.location.href)
        const segments = url.pathname.split('/')
        if (segments[1] === 'en' || segments[1] === 'es') {
            segments[1] = target
            url.pathname = segments.join('/')
        } else {
            url.pathname = `/${target}`
        }
        window.location.assign(url.pathname + url.search + url.hash)
    }
    return (
        <div className="flex items-center rounded-full border border-line/10 p-0.5 font-mono text-[11px] tracking-wide">
            {(['en', 'es'] as const).map((code) => (
                <Link
                    key={code}
                    href={`/${code}`}
                    prefetch={false}
                    onClick={(event) => switchTo(event, code)}
                    aria-label={code === 'en' ? dict.switchToEnglish || 'Switch to English' : dict.switchToSpanish || 'Switch to Spanish'}
                    aria-current={lang === code ? 'true' : undefined}
                    className={`rounded-full px-2.5 py-1 uppercase transition-colors duration-200 ${lang === code ? 'bg-fg text-navy' : 'text-fg-dim hover:text-fg'}`}
                >
                    {code}
                </Link>
            ))}
        </div>
    )
}

export default function SiteHeader({
    staticSections = [],
    currentIndex = 0,
    onSectionChange = () => {},
    dictionary = {},
    languageSwitcherDict = {},
    lang = 'en',
    linkOnly = false,
}: SiteHeaderProps) {
    const [open, setOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const menuRef = useRef<HTMLDivElement | null>(null)
    const buttonRef = useRef<HTMLButtonElement | null>(null)
    const reduce = useReducedMotion()
    const { scrollY, scrollYProgress } = useScroll()
    const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 })

    useMotionValueEvent(scrollY, 'change', (y) => {
        const next = y > 24
        if (next !== scrolled) setScrolled(next)
    })

    useEffect(() => {
        if (!open) return
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false)
                buttonRef.current?.focus()
            }
            if (event.key !== 'Tab' || !menuRef.current) return
            const focusables = menuRef.current.querySelectorAll<HTMLElement>('a, button')
            if (!focusables.length) return
            const first = focusables[0]
            const last = focusables[focusables.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }
        const onResize = () => window.innerWidth >= 1024 && setOpen(false)
        document.addEventListener('keydown', onKey)
        window.addEventListener('resize', onResize)
        document.body.classList.add('overflow-hidden')
        queueMicrotask(() => menuRef.current?.querySelector<HTMLElement>('a')?.focus())
        return () => {
            document.removeEventListener('keydown', onKey)
            window.removeEventListener('resize', onResize)
            document.body.classList.remove('overflow-hidden')
        }
    }, [open])

    if (!staticSections.length) return null

    const hrefFor = (id: string) => (id === 'home' ? `/${lang}` : `/${lang}#${id}`)
    const onLink = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        if (linkOnly) return
        event.preventDefault()
        const index = staticSections.findIndex((section) => section.id === id)
        if (index !== -1) onSectionChange(index)
        setOpen(false)
    }

    return (
        <header className="field-navy fixed inset-x-0 top-0 z-50 !bg-transparent">
            <a
                href="#content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-cream focus:px-4 focus:py-2 focus:text-sm focus:text-navy"
            >
                {dictionary.skipToContent || 'Skip to content'}
            </a>
            <div
                className={`transition-[background-color,border-color,backdrop-filter] duration-500 ${scrolled || open ? 'border-b border-line/[0.08] bg-navy/90 backdrop-blur-md' : 'border-b border-transparent bg-transparent'}`}
            >
                <nav
                    className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-5 sm:px-8"
                    aria-label={dictionary.mainNavigation || 'Main navigation'}
                >
                    <a
                        href={`/${lang}`}
                        onClick={(event) => onLink(event, 'home')}
                        className="group flex items-center gap-3 rounded-md text-[15px] font-medium tracking-tight text-fg"
                        aria-label={`Iñaki F. Lozano ${dictionary.home || 'Home'}`}
                    >
                        <Image src="/il-logo-mark.png" alt="" width={26} height={26} priority className="transition-transform duration-500 group-hover:rotate-[-6deg]" />
                        <span>Iñaki F. Lozano</span>
                    </a>

                    <div className="hidden items-center gap-1 lg:flex">
                        {staticSections.map((section, index) => {
                            const active = !linkOnly && index === currentIndex
                            return (
                                <a
                                    key={section.id}
                                    href={hrefFor(section.id)}
                                    onClick={(event) => onLink(event, section.id)}
                                    aria-current={active ? 'page' : undefined}
                                    className={`relative rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-200 ${active ? 'text-fg' : 'text-fg-dim hover:text-fg'}`}
                                >
                                    {section.label}
                                    {active && (
                                        <motion.span
                                            layoutId="nav-signal"
                                            className="absolute inset-x-3 -bottom-px h-px bg-signal"
                                            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 34 }}
                                        />
                                    )}
                                </a>
                            )
                        })}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden lg:block">
                            <LanguageToggle lang={lang} dict={languageSwitcherDict} />
                        </div>
                        <button
                            ref={buttonRef}
                            type="button"
                            className="grid h-10 w-10 place-items-center rounded-full border border-line/10 text-fg transition-colors hover:border-line/30 lg:hidden"
                            onClick={() => setOpen((value) => !value)}
                            aria-label={open ? dictionary.closeMenu || 'Close menu' : dictionary.openMenu || 'Open menu'}
                            aria-expanded={open}
                            aria-controls="mobile-menu"
                        >
                            {open ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
                        </button>
                    </div>
                </nav>
                <motion.div
                    aria-hidden="true"
                    className="h-0.5 origin-left bg-signal"
                    style={{ scaleX: progress }}
                />
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        ref={menuRef}
                        id="mobile-menu"
                        className="fixed inset-x-0 bottom-0 top-[65px] overflow-y-auto bg-navy px-6 pb-10 pt-6 lg:hidden"
                        initial={reduce ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <nav aria-label={dictionary.mobileNavigation || 'Mobile navigation'}>
                            <ul className="flex flex-col">
                                {staticSections.map((section, index) => (
                                    <motion.li
                                        key={section.id}
                                        initial={reduce ? false : { opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.5, delay: 0.03 * index, ease: EASE_OUT }}
                                    >
                                        <a
                                            href={hrefFor(section.id)}
                                            onClick={(event) => onLink(event, section.id)}
                                            aria-current={!linkOnly && index === currentIndex ? 'page' : undefined}
                                            className={`flex items-center justify-between border-b border-line/[0.07] py-4 text-3xl font-semibold tracking-[-0.03em] ${!linkOnly && index === currentIndex ? 'text-fg' : 'text-fg-soft'}`}
                                        >
                                            {section.label}
                                            {!linkOnly && index === currentIndex && <span className="h-2 w-2 rounded-full bg-signal" aria-hidden="true" />}
                                        </a>
                                    </motion.li>
                                ))}
                            </ul>
                            <div className="mt-8">
                                <LanguageToggle lang={lang} dict={languageSwitcherDict} />
                            </div>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    )
}
