'use client'

import { isOngoing } from './LiveDot'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'
import Trace, { TraceNode } from './Trace'
import { clean, pick, type Lang } from './content'

interface ExperienceSectionProps {
    traceTop?: boolean
    traceBottom?: boolean
    lang?: Lang
    initialContent?: Record<string, any> | null
    dictionary?: any
}

export default function ExperienceSection({ lang = 'en', initialContent = null, dictionary = {}, traceTop = false, traceBottom = false }: ExperienceSectionProps) {
    const experiences: Record<string, any>[] = initialContent?.experiences || []
    if (!experiences.length) return null
    const t = dictionary?.experience || {}

    return (
        <Trace joinTop={traceTop} joinBottom={traceBottom}>
            <SectionHeading title={t.title || 'Experience'} circuit="pipeline" />
            <ol className="mt-16 space-y-16 md:space-y-20">
                {experiences.map((exp, index) => {
                    const description = clean(pick(lang, exp, 'description'))
                    const responsibilities: string[] = (pick(lang, exp, 'responsibilities') || []).map(clean).filter(Boolean)
                    return (
                        <Reveal as="li" key={`${exp.company}-${index}`} className="relative pl-8 md:pl-14">
                            <TraceNode live={isOngoing(exp.period)} />
                            <div className="grid gap-x-12 gap-y-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]">
                                <div>
                                    <p className="font-mono text-[13px] text-fg-dim">{clean(pick(lang, exp, 'period'))}</p>
                                    <h3 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-fg sm:text-3xl">{clean(pick(lang, exp, 'title'))}</h3>
                                    <p className="mt-2 text-lg text-fg-soft">{clean(exp.company)}</p>
                                </div>
                                <div className="text-[17px] leading-relaxed text-fg-soft">
                                    {description && <p className="max-w-[62ch]">{description}</p>}
                                    {responsibilities.length > 0 && (
                                        <ul className={`${description ? 'mt-6' : ''} grid gap-3`} aria-label={t.keyResponsibilities || 'Key Responsibilities'}>
                                            {responsibilities.map((item) => (
                                                <li key={item} className="flex gap-4">
                                                    <span aria-hidden="true" className="mt-[0.7em] h-px w-4 shrink-0 bg-signal/70" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </Reveal>
                    )
                })}
            </ol>
        </Trace>
    )
}
