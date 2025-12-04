'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FaLinkedin, FaGithub, FaEnvelope } from 'react-icons/fa'
import type { ContactContent } from '@/models/Section'

interface FooterProps {
    dictionary?: any;
}

export default function Footer({ dictionary = {} }: FooterProps) {
    const [contactData, setContactData] = useState<ContactContent>({
        email: 'inakilozano01@gmail.com',
        city: 'San Miguel de Tucumán, Argentina',
        social: {
            github: 'https://github.com/InakiLozano01',
            linkedin: 'https://www.linkedin.com/in/inaki-lozano'
        }
    })
    const currentYear = new Date().getFullYear()

    useEffect(() => {
        const fetchContactData = async () => {
            try {
                const response = await fetch('/api/sections/contact')
                if (!response.ok) throw new Error('Failed to fetch contact data')
                const data = await response.json()
                if (data.content) {
                    setContactData(data.content)
                }
            } catch (error) {
                console.error('Error fetching contact data:', error)
                // Keep the fallback data
            }
        }

        fetchContactData()
    }, [])

    const copyrightText = dictionary.copyright
        ? dictionary.copyright.replace('{year}', currentYear)
        : `© ${currentYear} Iñaki Fernando Lozano`

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
                        <Link
                            href={contactData.social.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#FD4345] transition-colors"
                            aria-label={dictionary.linkedin || "LinkedIn"}
                        >
                            <span className="pointer-events-none">
                                <FaLinkedin size={20} />
                            </span>
                        </Link>
                    )}
                    {contactData.social.github && (
                        <Link
                            href={contactData.social.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#FD4345] transition-colors"
                            aria-label={dictionary.github || "GitHub"}
                        >
                            <span className="pointer-events-none">
                                <FaGithub size={20} />
                            </span>
                        </Link>
                    )}
                    {contactData.email && (
                        <Link
                            href={`mailto:${contactData.email}`}
                            className="hover:text-[#FD4345] transition-colors"
                            aria-label={dictionary.email || "Email"}
                        >
                            <span className="pointer-events-none">
                                <FaEnvelope size={20} />
                            </span>
                        </Link>
                    )}
                </div>
                <p className="text-sm text-gray-400">{copyrightText}</p>
            </div>
        </footer>
    )
}


