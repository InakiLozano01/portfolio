'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Github, Linkedin, Mail } from 'lucide-react'
import type { ContactContent } from '@/models/Section'

interface FooterProps {
    dictionary?: any;
    initialContact?: ContactContent | null;
    currentYear?: number;
    lang?: 'en' | 'es';
}

export default function Footer({ dictionary = {}, initialContact = null, currentYear, lang = 'en' }: FooterProps) {
    const fallbackContact: ContactContent = {
        email: 'inakilozano01@gmail.com',
        city: 'San Miguel de Tucumán, Argentina',
        social: {
            github: 'https://github.com/InakiLozano01',
            linkedin: 'https://www.linkedin.com/in/inaki-lozano'
        }
    }
    const [fetchedContact, setFetchedContact] = useState<ContactContent | null>(null)
    const contactData = initialContact ?? fetchedContact ?? fallbackContact
    const displayYear = currentYear ?? new Date().getFullYear()

    useEffect(() => {
        if (initialContact) {
            return
        }

        const fetchContactData = async () => {
            try {
                const response = await fetch('/api/sections/contact')
                if (!response.ok) throw new Error('Failed to fetch contact data')
                const data = await response.json()
                if (data.content) {
                    setFetchedContact(data.content)
                }
            } catch (error) {
                console.error('Error fetching contact data:', error)
                // Keep the fallback data
            }
        }

        fetchContactData()
    }, [initialContact])

    const copyrightText = dictionary.copyright
        ? dictionary.copyright.replace('{year}', String(displayYear))
        : `© ${displayYear} Iñaki Fernando Lozano`

    return (
        <footer
            className="bg-navy text-cream/80 border-t border-cream/10 pb-safe-area"
        >
            <div
                className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between px-4 sm:px-6 lg:px-8 py-10 md:py-14"
            >
                <div className="flex items-center space-x-4">
                    {contactData.social.linkedin && (
                        <a
                            href={contactData.social.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#FD4345] transition-colors"
                            aria-label={dictionary.linkedin || "LinkedIn"}
                        >
                            <span className="pointer-events-none">
                                <Linkedin className="h-5 w-5" />
                            </span>
                        </a>
                    )}
                    {contactData.social.github && (
                        <a
                            href={contactData.social.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#FD4345] transition-colors"
                            aria-label={dictionary.github || "GitHub"}
                        >
                            <span className="pointer-events-none">
                                <Github className="h-5 w-5" />
                            </span>
                        </a>
                    )}
                    {contactData.email && (
                        <a
                            href={`mailto:${contactData.email}`}
                            className="hover:text-[#FD4345] transition-colors"
                            aria-label={dictionary.email || "Email"}
                        >
                            <span className="pointer-events-none">
                                <Mail className="h-5 w-5" />
                            </span>
                        </a>
                    )}
                </div>
                <Link
                    href={`/${lang}/legal`}
                    className="rounded-sm text-sm text-cream/80 transition-colors hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD4345] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a2433]"
                    aria-label={dictionary.legalNotice || copyrightText}
                >
                    {copyrightText}
                </Link>
            </div>
        </footer>
    )
}
