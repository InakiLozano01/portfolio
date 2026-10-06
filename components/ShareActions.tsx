'use client'

import { useCallback, useState } from 'react'
import { Twitter, Linkedin, Link as LinkIcon } from 'lucide-react'

interface ShareActionsProps {
    url: string
    title: string
    dict?: any
}

export default function ShareActions({ url, title, dict = {} }: ShareActionsProps) {
    const [copied, setCopied] = useState(false)

    const shareOnTwitter = useCallback(() => {
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
        window.open(shareUrl, '_blank', 'noopener,noreferrer')
    }, [title, url])

    const shareOnLinkedIn = useCallback(() => {
        const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        window.open(shareUrl, '_blank', 'noopener,noreferrer')
    }, [url])

    const copyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            setCopied(false)
        }
    }, [url])

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
                onClick={shareOnTwitter}
                className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-fg-soft transition-colors hover:text-fg"
            >
                <Twitter size={16} /> {dict?.shareOnTwitter || 'Share on Twitter'}
            </button>
            <button
                onClick={shareOnLinkedIn}
                className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-fg-soft transition-colors hover:text-fg"
            >
                <Linkedin size={16} /> {dict?.shareOnLinkedin || 'Share on LinkedIn'}
            </button>
            <button
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-fg-soft transition-colors hover:text-fg"
                aria-label={dict?.copyLinkAria || 'Copy link'}
            >
                <LinkIcon size={16} /> {copied ? (dict?.copied || 'Copied!') : (dict?.copyLink || 'Copy link')}
            </button>
        </div>
    )
}


