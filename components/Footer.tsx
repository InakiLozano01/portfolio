'use client'

import { useEffect, useState } from 'react'
import { Github, Linkedin, Mail } from 'lucide-react'
import type { ContactContent } from '@/models/Section'

interface FooterProps {
    dictionary?: any;
    initialContact?: ContactContent | null;
    currentYear?: number;
}

export default function Footer({ dictionary = {}, initialContact = null, currentYear }: FooterProps) {
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
            className="fixed inset-x-0 bg-[#1a2433] text-white z-50 md:relative md:flex-shrink-0"
            style={{
                bottom: 'calc(env(safe-area-inset-bottom, 0px) * -1)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                minHeight: 'calc(40px + env(safe-area-inset-bottom, 0px))',
            }}
        >
            <div
                className="container mx-auto flex h-[40px] items-center justify-between px-4"
                style={{ marginBottom: 'calc(env(safe-area-inset-bottom, 0px) * -1)' }}
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
                <p className="text-sm text-gray-400">{copyrightText}</p>
            </div>
        </footer>
    )
}
