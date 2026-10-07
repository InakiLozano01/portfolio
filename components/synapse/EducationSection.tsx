'use client'

import { isOngoing } from './LiveDot'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'
import Trace, { TraceNode } from './Trace'
import { clean, pick, type Lang } from './content'

interface EducationSectionProps {
    traceTop?: boolean
    traceBottom?: boolean
    lang?: Lang
    initialContent?: Record<string, any> | null
    dictionary?: any
}

export default function EducationSection({ lang = 'en', initialContent = null, dictionary = {}, traceTop = false, traceBottom = false }: EducationSectionProps) {
    const education: Record<string, any>[] = initialContent?.education || []
    if (!education.length) return null
    const t = dictionary?.education || {}

    return (
        <Trace joinTop={traceTop} joinBottom={traceBottom}>
            <SectionHeading title={t.title || 'Education'} />
            <ol className="mt-16 space-y-14">
                {education.map((edu, index) => {
                    const description = clean(pick(lang, edu, 'description'))
                    return (
                        <Reveal as="li" key={`${edu.institution}-${index}`} delay={index * 0.08} className="relative pl-8 md:pl-14">
                            <TraceNode live={isOngoing(edu.period)} />
                            <div className="grid gap-x-12 gap-y-4 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]">
                                <div>
                                    <p className="font-mono text-[13px] text-fg-dim">{clean(pick(lang, edu, 'period'))}</p>
                                    <h3 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-fg sm:text-3xl">{clean(pick(lang, edu, 'degree'))}</h3>
                                </div>
                                <div className="text-[17px] leading-relaxed text-fg-soft lg:pt-8">
                                    <p className="text-lg text-fg/90">{clean(edu.institution)}</p>
                                    {description && <p className="mt-3 max-w-[56ch]">{description}</p>}
                                </div>
                            </div>
                        </Reveal>
                    )
                })}
            </ol>
        </Trace>
    )
}
