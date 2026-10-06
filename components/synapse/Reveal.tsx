'use client'

import { motion } from 'framer-motion'
import { EASE_OUT } from './content'

interface RevealProps {
    children: React.ReactNode
    delay?: number
    className?: string
    as?: 'div' | 'li' | 'article' | 'header'
    onPointerMove?: React.PointerEventHandler<HTMLElement>
    onPointerLeave?: React.PointerEventHandler<HTMLElement>
}

/** Content rises out of a soft blur as it enters the viewport; static under reduced motion. */
export default function Reveal({ children, delay = 0, className, as = 'div', onPointerMove, onPointerLeave }: RevealProps) {
    const Component = motion[as]
    return (
        <Component
            className={className}
            onPointerMove={onPointerMove as any}
            onPointerLeave={onPointerLeave as any}
            initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.9, delay, ease: EASE_OUT }}
        >
            {children}
        </Component>
    )
}
