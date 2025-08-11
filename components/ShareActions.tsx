'use client'

import { useCallback, useState } from 'react'
import { Twitter, Linkedin, Link as LinkIcon } from 'lucide-react'

interface ShareActionsProps {
    url: string
    title: string
}

export default function ShareActions({ url, title }: ShareActionsProps) {
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
        <div className="flex items-center gap-3">
            <button
                onClick={shareOnTwitter}
                className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                aria-label="Share on Twitter"
            >
                <Twitter size={16} /> Share
            </button>
            <button
                onClick={shareOnLinkedIn}
                className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                aria-label="Share on LinkedIn"
            >
                <Linkedin size={16} /> Share
            </button>
            <button
                onClick={copyLink}
                className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                aria-label="Copy link"
            >
                <LinkIcon size={16} /> {copied ? 'Copied!' : 'Copy link'}
            </button>
        </div>
    )
}


