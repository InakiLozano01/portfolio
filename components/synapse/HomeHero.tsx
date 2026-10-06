'use client'

import { useMemo, useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import NeuralSwarm, { type SwarmTarget } from './NeuralSwarm'
import { clean, pick, projectSlug, type Lang, type ProjectCard } from './content'

interface HomeHeroProps {
    lang?: Lang
    initialContent?: Record<string, any> | null
    initialProjects?: ProjectCard[]
    dictionary?: any
}

function MagneticLink({ href, children, className }: { href: string; children: React.ReactNode; className: string }) {
    const reduce = useReducedMotion()
    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 })
    const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 })
    return (
        <motion.a
            href={href}
            className={className}
            style={reduce ? undefined : { x: sx, y: sy }}
            onPointerMove={(event) => {
                if (reduce || event.pointerType !== 'mouse') return
                const rect = event.currentTarget.getBoundingClientRect()
                x.set((event.clientX - rect.left - rect.width / 2) * 0.25)
                y.set((event.clientY - rect.top - rect.height / 2) * 0.35)
            }}
            onPointerLeave={() => {
                x.set(0)
                y.set(0)
            }}
            whileTap={{ scale: 0.97 }}
        >
            {children}
        </motion.a>
    )
}

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
    const opacity = useTransform(progress, range, [0.14, 1])
    return (
        <motion.span style={{ opacity }} className="inline-block">
            {word}&nbsp;
        </motion.span>
    )
}

/** Scroll-linked (the reader drives it); identical markup on server and client. */
function Statement({ text }: { text: string }) {
    const ref = useRef<HTMLParagraphElement | null>(null)
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] })
    const words = text.split(/\s+/).filter(Boolean)
    return (
        <p ref={ref} className="text-[clamp(1.6rem,3.4vw,3rem)] font-medium leading-[1.2] tracking-[-0.03em] text-fg">
            <span className="sr-only">{text}</span>
            <span aria-hidden="true">
                {words.map((word, i) => (
                    <Word key={`${word}-${i}`} word={word} progress={scrollYProgress} range={[i / words.length, Math.min(1, (i + 3) / words.length)]} />
                ))}
            </span>
        </p>
    )
}

export default function HomeHero({ lang = 'en', initialContent = null, initialProjects = [], dictionary = {} }: HomeHeroProps) {
    const reduce = useReducedMotion()
    const sectionNames = dictionary?.sections
    // Every labelled neuron is a door: sections scroll the page, projects open their case study.
    const targets = useMemo<SwarmTarget[]>(() => {
        const sections: SwarmTarget[] = ['about', 'education', 'experience', 'skills', 'projects', 'blog', 'contact'].map((id) => ({
            label: sectionNames?.[id] || id,
            href: `#${id}`,
            kind: 'section',
        }))
        const projects: SwarmTarget[] = initialProjects
            .filter((p) => projectSlug(p))
            .map((p) => ({ label: clean(pick(lang, p, 'title')), href: `/${lang}/projects/${projectSlug(p)}`, kind: 'project' }))
        return [...sections, ...projects]
    }, [initialProjects, lang, sectionNames])
    const heroRef = useRef<HTMLDivElement | null>(null)
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
    const swarmScale = useTransform(scrollYProgress, [0, 1], [1, 1.25])
    const swarmOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0])
    const copyY = useTransform(scrollYProgress, [0, 1], [0, -80])

    if (!initialContent) return null
    const headline = clean(pick(lang, initialContent, 'headline'))
    const description = clean(pick(lang, initialContent, 'description'))
    const t = dictionary?.hero || {}
    const rise = (delay: number) => ({ className: 'synapse-rise', style: { '--d': `${delay}ms` } as React.CSSProperties })

    return (
        <div>
            <div ref={heroRef} className="field-navy relative isolate min-h-[100dvh] overflow-hidden">
                <motion.div className="absolute inset-0 -z-10" style={{ scale: swarmScale, opacity: swarmOpacity }}>
                    <NeuralSwarm targets={targets} className="h-full w-full" />
                </motion.div>

                <motion.div
                    style={reduce ? undefined : { y: copyY }}
                    className="pointer-events-none mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col justify-start px-5 pb-16 pt-28 sm:px-8 lg:justify-center lg:pt-16"
                >
                    <div className="pointer-events-auto max-w-[620px]">
                        <div className="inline-block max-w-full">
                        <h1 className="text-[clamp(3.1rem,7.4vw,6rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-fg">
                            {/* Each word rises out of its own mask; CSS-only, so it runs before hydration. */}
                            <span className="synapse-word"><span style={{ '--d': '120ms' } as React.CSSProperties}>Iñaki</span></span>{' '}
                            <span className="synapse-word"><span style={{ '--d': '230ms' } as React.CSSProperties}>F<span className="text-coral">.</span></span></span>{' '}
                            <span className="synapse-word"><span style={{ '--d': '340ms' } as React.CSSProperties}>Lozano</span></span>
                        </h1>
                        {/* The coral underline from the brand's own share card, drawn in after the name. */}
                        <span aria-hidden="true" className="synapse-underline mt-5 block h-[6px] w-full rounded-full bg-coral sm:h-[7px]" style={{ '--d': '700ms' } as React.CSSProperties} />
                        </div>
                        {headline && (
                            <p {...rise(550)}>
                                <span className="mt-6 block max-w-[34ch] text-lg leading-relaxed text-fg-soft sm:text-xl">{headline}</span>
                            </p>
                        )}
                        <div {...rise(750)}>
                            <div className="mt-10 flex flex-wrap items-center gap-2.5 sm:gap-3">
                                <MagneticLink
                                    href="#contact"
                                    className="group inline-flex h-12 items-center gap-2 rounded-full bg-coral px-5 text-[15px] font-semibold sm:px-6 text-navy transition-colors duration-300 hover:bg-cream"
                                >
                                    {t.getInTouch || 'Get in touch'}
                                    <ArrowUpRight size={16} strokeWidth={1.75} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                </MagneticLink>
                                <MagneticLink
                                    href="#projects"
                                    className="group inline-flex h-12 items-center gap-2 rounded-full border border-line/25 px-5 text-[15px] sm:px-6 font-medium text-fg transition-colors duration-300 hover:border-line/60"
                                >
                                    {t.viewWork || 'View work'}
                                    <ArrowDownRight size={16} strokeWidth={1.75} className="transition-transform duration-300 group-hover:translate-y-0.5" />
                                </MagneticLink>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {description && (
                <div className="field-cream">
                    <div className="mx-auto max-w-[1400px] px-5 py-28 sm:px-8 md:py-40">
                        <div className="max-w-5xl">
                            <Statement text={description} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
