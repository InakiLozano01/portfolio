'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BackNavigationHandler() {
    const router = useRouter()

    useEffect(() => {
        // Scroll to top when component mounts (page loads)
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        
        const handlePopState = (event: PopStateEvent) => {
            // If the URL contains a hash, navigate to home
            if (window.location.hash) {
                event.preventDefault()
                router.push('/')
            }
        }

        window.addEventListener('popstate', handlePopState)

        return () => {
            window.removeEventListener('popstate', handlePopState)
        }
    }, [router])

    return null
} 