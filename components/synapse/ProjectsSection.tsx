'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import SkillIcon from '@/components/SkillIcon'
import SectionHeading from './SectionHeading'
import { clean, EASE_OUT, pick, projectSlug, publicUrl, type Lang, type ProjectCard } from './content'

interface ProjectsSectionProps {
    lang?: Lang
    initialProjects?: ProjectCard[]
    dictionary?: any
}

const BLUR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTYnIGhlaWdodD0nOScgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48cmVjdCBmaWxsPSIjZjBlY2U2IiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+'

function ProjectPanel({ project, lang, t }: { project: ProjectCard; lang: Lang; t: any }) {
    const reduce = useReducedMotion()
    const rx = useMotionValue(0)
    const ry = useMotionValue(0)
    const srx = useSpring(rx, { stiffness: 200, damping: 20 })
    const sry = useSpring(ry, { stiffness: 200, damping: 20 })
    const slug = projectSlug(project)
    if (!slug) return null
    const title = clean(pick(lang, project, 'title'))
    const subtitle = clean(pick(lang, project, 'subtitle'))
    const external = publicUrl(project.publicUrl)
    const thumb = project.thumbnailSmall || project.thumbnail

    return (
        <motion.article
            className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line/[0.12] bg-surface transition-[border-color,transform] duration-300 [transform-style:preserve-3d] hover:border-bordeaux"
            style={reduce ? undefined : { rotateX: srx, rotateY: sry, transformPerspective: 1200 }}
            onPointerMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                const px = event.clientX - rect.left
                const py = event.clientY - rect.top
                if (event.pointerType === 'mouse') {
                    rx.set(((py / rect.height) - 0.5) * -6)
                    ry.set(((px / rect.width) - 0.5) * 8)
                }
            }}
            onPointerLeave={() => {
                rx.set(0)
                ry.set(0)
            }}
        >
            <div className="relative aspect-[16/9] overflow-hidden border-b border-line/[0.08] bg-fg/[0.04]">
                {thumb && (
                    <Image
                        src={thumb}
                        // The CMS already creates a compact 640px WebP for the grid.
                        unoptimized={Boolean(project.thumbnailSmall)}
                        alt={`${t.thumbnailAlt || 'Thumbnail image for project'} ${title}`}
                        fill
                        sizes="(max-width: 1024px) 100vw, 560px"
                        placeholder="blur"
                        blurDataURL={project.thumbnailBlur || BLUR}
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                )}
            </div>
            <div className="flex flex-1 flex-col p-6 sm:p-7">
                <h3 className="text-2xl font-semibold tracking-[-0.025em] text-fg">
                    <Link
                        href={`/${lang}/projects/${slug}`}
                        className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-coral"
                    >
                        {title}
                    </Link>
                </h3>
                {subtitle && <p className="mt-3 line-clamp-2 text-[15px] leading-relaxed text-fg-soft">{subtitle}</p>}
                {project.technologies && project.technologies.length > 0 && (
                    <ul className="mt-6 flex flex-wrap gap-1.5">
                        {project.technologies.slice(0, 6).map((tech) => (
                            <li key={tech._id} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-fg/[0.06] px-2.5 text-xs font-medium text-fg-soft">
                                <SkillIcon name={tech.name} icon={tech.icon || ''} size={12} className="h-3 w-3" />
                                {tech.name}
                            </li>
                        ))}
                    </ul>
                )}
                <div className="mt-auto flex items-center justify-between gap-4 pt-7">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-fg">
                        {t.open || 'Open project'}
                        <ArrowUpRight size={15} strokeWidth={1.75} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                    {external && (
                        <a
                            href={external}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative z-10 text-sm text-fg-dim underline decoration-line/20 underline-offset-4 transition-colors hover:text-fg hover:decoration-signal"
                        >
                            {t.visitProject || 'Visit project'}
                        </a>
                    )}
                </div>
            </div>
        </motion.article>
    )
}

export default function ProjectsSection({ lang = 'en', initialProjects = [], dictionary = {} }: ProjectsSectionProps) {
    const reduce = useReducedMotion()
    const t = dictionary?.projects || {}
    const outerRef = useRef<HTMLDivElement | null>(null)
    const trackRef = useRef<HTMLDivElement | null>(null)
    const [pan, setPan] = useState(false)
    const [distance, setDistance] = useState(0)

    const projects = useMemo(() => initialProjects.filter((p) => projectSlug(p)), [initialProjects])

    useEffect(() => {
        const query = window.matchMedia('(min-width: 1024px)')
        const update = () => setPan(query.matches && !reduce)
        update()
        query.addEventListener('change', update)
        return () => query.removeEventListener('change', update)
    }, [reduce])

    useEffect(() => {
        if (!pan || !trackRef.current) return
        const measure = () => {
            const track = trackRef.current
            if (track) setDistance(Math.max(0, track.scrollWidth - window.innerWidth))
        }
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(trackRef.current)
        window.addEventListener('resize', measure)
        return () => {
            observer.disconnect()
            window.removeEventListener('resize', measure)
        }
    }, [pan, projects.length])

    const { scrollYProgress } = useScroll({ target: outerRef, offset: ['start start', 'end end'] })
    const x = useTransform(scrollYProgress, (v) => -v * distance)
    const smoothX = useSpring(x, { stiffness: 120, damping: 28, mass: 0.3 })

    if (!projects.length) return null
    const header = (
        <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8">
            <SectionHeading title={t.heading || 'Projects'} lead={t.principalProject} />
            {t.principalProject && (
                <a
                    href="https://ethos.ar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-medium text-signal-text underline decoration-signal/40 underline-offset-[6px] transition-colors hover:decoration-signal"
                >
                    {t.visitEthos || 'Visit Ethos'}
                    <ArrowUpRight size={15} strokeWidth={1.75} />
                </a>
            )}
        </div>
    )

    if (!pan) {
        return (
            <div ref={outerRef} className="py-24 md:py-32">
                {header}
                <div className="mx-auto mt-12 grid max-w-[1400px] gap-5 px-5 sm:grid-cols-2 sm:px-8">
                    {projects.map((project, i) => (
                        <motion.div
                            key={project._id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ duration: 0.8, delay: (i % 2) * 0.08, ease: EASE_OUT }}
                        >
                            <ProjectPanel project={project} lang={lang} t={t} />
                        </motion.div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div ref={outerRef} style={{ height: `calc(100dvh + ${distance}px)` }} className="relative">
            <div className="sticky top-0 flex h-[100dvh] flex-col justify-center gap-10 overflow-hidden pt-16">
                {header}
                <motion.div ref={trackRef} style={{ x: smoothX }} className="flex w-max gap-6 pl-[max(2rem,calc((100vw-1400px)/2+2rem))] pr-[10vw]">
                    {projects.map((project) => (
                        <div key={project._id} className="h-[min(54dvh,500px)] w-[min(440px,33vw)] shrink-0">
                            <ProjectPanel project={project} lang={lang} t={t} />
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    )
}
