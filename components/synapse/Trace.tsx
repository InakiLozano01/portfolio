'use client'

import { useRef } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import LiveDot from './LiveDot'

/**
 * The signal trace: one vertical synapse through the heading node and every entry.
 * It reaches into the section padding so consecutive trace sections join into one line.
 */
export default function Trace({ children, joinTop = false, joinBottom = false }: { children: React.ReactNode; joinTop?: boolean; joinBottom?: boolean }) {
    const ref = useRef<HTMLDivElement | null>(null)
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.75', 'end 0.55'] })
    const fill = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.5 })
    // Reach into the section padding only toward a neighbouring trace section, so the two join.
    const reach = `${joinTop ? '-top-20 md:-top-28' : 'top-3'} ${joinBottom ? '-bottom-20 md:-bottom-28' : 'bottom-3'}`
    return (
        <div ref={ref} className="relative">
            <span aria-hidden="true" className={`absolute left-[4.5px] w-px bg-fg/[0.09] ${reach}`} />
            <motion.span
                aria-hidden="true"
                className={`absolute left-[4.5px] w-px origin-top bg-signal ${reach}`}
                style={{ scaleY: fill }}
            />
            {children}
        </div>
    )
}

/** A node on the trace: live (coral pulse) for something ongoing, otherwise a hollow ring. */
export function TraceNode({ live }: { live: boolean }) {
    return (
        <span aria-hidden="true" className="absolute left-0 top-[0.4rem] grid h-2.5 w-2.5 place-items-center rounded-full bg-field">
            {live ? <LiveDot /> : <span className="h-2 w-2 rounded-full border border-line/50 bg-field" />}
        </span>
    )
}
