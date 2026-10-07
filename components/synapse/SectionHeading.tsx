'use client'

import { motion } from 'framer-motion'
import { EASE_OUT } from './content'
import SectionCircuit, { type CircuitKind } from './SectionCircuit'

interface SectionHeadingProps {
    title: string
    lead?: string
    id?: string
    className?: string
    circuit?: CircuitKind
}

/** Section title with a coral signal node that fires as the heading arrives. */
export default function SectionHeading({ title, lead, id, className = '', circuit }: SectionHeadingProps) {
    return (
        <div className={`section-heading ${className}`}>
            <div className="min-w-0 max-w-3xl flex-1">
            <motion.h2
                id={id}
                className="flex items-baseline gap-4 text-4xl font-semibold tracking-[-0.035em] text-fg text-balance sm:text-5xl lg:text-6xl"
                initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.9, ease: EASE_OUT }}
            >
                <span className="relative top-[-0.12em] inline-flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
                    <span className="absolute inset-0 rounded-full bg-signal" />
                </span>
                <span>{title}</span>
            </motion.h2>
            {lead && (
                <motion.p
                    className="mt-5 max-w-[60ch] text-lg leading-relaxed text-fg-soft"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.8, delay: 0.1, ease: EASE_OUT }}
                >
                    {lead}
                </motion.p>
            )}
            </div>
            {circuit && <SectionCircuit kind={circuit} />}
        </div>
    )
}
