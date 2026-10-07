'use client'

import Image from 'next/image'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { ArrowUpRight, Download } from 'lucide-react'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'
import { clean, EASE_OUT, pick, type Lang } from './content'

interface AboutSectionProps {
    lang?: Lang
    initialContent?: Record<string, any> | null
    dictionary?: any
}

export default function AboutSection({ lang = 'en', initialContent = null, dictionary = {} }: AboutSectionProps) {
    const reduce = useReducedMotion()
    const ref = useRef<HTMLDivElement | null>(null)
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
    const portraitY = useTransform(scrollYProgress, [0, 1], [40, -40])
    if (!initialContent) return null

    const t = dictionary?.about || {}
    const description = clean(pick(lang, initialContent, 'description'))
    const highlights: string[] = (pick(lang, initialContent, 'highlights') || []).map(clean).filter(Boolean)
    const paragraphs = description.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

    return (
        <div ref={ref} className="grid items-start gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
            <motion.div style={reduce ? undefined : { y: portraitY }} className="relative mx-auto w-full max-w-[280px] sm:max-w-[420px] lg:sticky lg:top-28">
                <div className="relative aspect-square">
                    <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute -inset-5 h-[calc(100%+2.5rem)] w-[calc(100%+2.5rem)] animate-[synapse-orbit_38s_linear_infinite] text-fg">
                        <circle cx="50" cy="50" r="49.4" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.25" strokeDasharray="0.6 2.2" />
                        <circle cx="50" cy="0.6" r="1.1" fill="#fd4345" />
                    </svg>
                    <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute -inset-8 h-[calc(100%+4rem)] w-[calc(100%+4rem)] animate-[synapse-orbit_64s_linear_infinite_reverse] text-fg sm:-inset-12 sm:h-[calc(100%+6rem)] sm:w-[calc(100%+6rem)]">
                        <circle cx="50" cy="50" r="49.6" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.2" />
                        <circle cx="0.4" cy="50" r="0.7" fill="currentColor" />
                    </svg>
                    <div className="relative h-full w-full overflow-hidden rounded-full ring-1 ring-line/15">
                        <Image
                            src="/pfp.jpg"
                            alt={t.profileAlt || "Iñaki Lozano's profile picture"}
                            fill
                            sizes="(max-width: 1024px) 80vw, 420px"
                            className="object-cover"
                        />
                    </div>
                </div>
            </motion.div>

            <div>
                <SectionHeading title={t.aboutMe || 'About Me'} circuit="neural" />
                <div className="mt-10 space-y-6 text-lg leading-[1.75] text-fg-soft">
                    {paragraphs.map((paragraph, i) => (
                        <Reveal key={i} delay={i * 0.05}>
                            <p className="max-w-[65ch]">{paragraph}</p>
                        </Reveal>
                    ))}
                </div>

                {highlights.length > 0 && (
                    <Reveal className="mt-12">
                        <h3 className="text-sm font-medium text-fg-dim">{t.hobbies || 'Hobbies & Interests'}</h3>
                        <ul className="mt-4 flex flex-wrap gap-2" aria-label={t.hobbies || 'Hobbies & Interests'}>
                            {highlights.map((item, i) => (
                                <motion.li
                                    key={item}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.06 * i, ease: EASE_OUT }}
                                    className="rounded-full bg-fg/[0.06] px-4 py-2 text-sm text-fg"
                                >
                                    {item}
                                </motion.li>
                            ))}
                        </ul>
                    </Reveal>
                )}

                <Reveal className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4">
                    <a
                        href="/CV.pdf"
                        download
                        aria-label={`${t.downloadCV || 'Download CV'} ${t.pdfSuffix || '(PDF)'}`}
                        className="group inline-flex h-12 items-center gap-2 rounded-full bg-action px-6 text-[15px] font-medium text-action-fg transition-colors duration-300 hover:bg-navy"
                    >
                        <Download size={16} strokeWidth={1.75} className="transition-transform duration-300 group-hover:translate-y-0.5" />
                        {t.downloadCV || 'Download CV'}
                    </a>
                    <a
                        href="/CV.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-fg-soft underline decoration-line/25 underline-offset-[6px] transition-colors hover:text-fg hover:decoration-signal"
                    >
                        {t.viewCV || 'View CV'}
                        <ArrowUpRight size={15} strokeWidth={1.75} />
                    </a>
                </Reveal>
            </div>
        </div>
    )
}
