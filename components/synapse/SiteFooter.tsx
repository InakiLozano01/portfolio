'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Github, Linkedin, Mail } from 'lucide-react'
import { EASE_OUT } from './content'

interface SiteFooterProps {
    dictionary?: any
    initialContact?: { email?: string; social?: { github?: string; linkedin?: string } } | null
    currentYear?: number
    lang?: 'en' | 'es'
}

export default function SiteFooter({ dictionary = {}, initialContact = null, currentYear, lang = 'en' }: SiteFooterProps) {
    const reduce = useReducedMotion()
    const year = currentYear ?? new Date().getFullYear()
    const copyright = dictionary.copyright ? dictionary.copyright.replace('{year}', String(year)) : `© ${year} Iñaki Fernando Lozano`
    const contact = initialContact || {}
    const social = contact.social || {}
    const links = [
        social.linkedin && { href: social.linkedin, label: dictionary.linkedin || 'LinkedIn', icon: Linkedin, external: true },
        social.github && { href: social.github, label: dictionary.github || 'GitHub', icon: Github, external: true },
        contact.email && { href: `mailto:${contact.email}`, label: dictionary.email || 'Email', icon: Mail, external: false },
    ].filter(Boolean) as { href: string; label: string; icon: typeof Mail; external: boolean }[]

    return (
        <footer className="field-navy relative overflow-hidden pb-[env(safe-area-inset-bottom)]">
            <motion.span
                aria-hidden="true"
                className="absolute left-0 top-0 h-0.5 w-24 bg-signal"
                
                initial={{ x: '-10vw' }}
                animate={reduce ? undefined : { x: '110vw' }}
                transition={{ duration: 6, repeat: Infinity, repeatDelay: 4, ease: 'linear' }}
            />
            <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-20 sm:px-8">
                <motion.p
                    aria-hidden="true"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 1.2, ease: EASE_OUT }}
                    className="select-none whitespace-nowrap text-[clamp(3rem,11vw,10rem)] font-semibold leading-none tracking-[-0.05em] text-fg"
                >
                    Iñaki F. Lozano
                </motion.p>
                <div className="mt-14 flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Image src="/il-logo-mark.png" alt="" width={22} height={22} />
                        <Link
                            href={`/${lang}/legal`}
                            aria-label={dictionary.legalNotice || copyright}
                            className="text-sm text-fg-dim transition-colors hover:text-fg"
                        >
                            {copyright}
                        </Link>
                    </div>
                    <ul className="flex items-center gap-2">
                        {links.map(({ href, label, icon: Icon, external }) => (
                            <li key={label}>
                                <a
                                    href={href}
                                    aria-label={label}
                                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                    className="grid h-11 w-11 place-items-center rounded-full border border-line/10 text-fg-soft transition-[color,border-color,box-shadow] duration-300 hover:border-signal/60 hover:text-fg"
                                >
                                    <Icon size={17} strokeWidth={1.75} />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </footer>
    )
}
