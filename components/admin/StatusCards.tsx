'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Briefcase, Wrench, FileText } from 'lucide-react'

interface Counts {
    messages: number
    unread: number
    projects: number
    skills: number
    blogs: number
}

export default function StatusCards() {
    const [counts, setCounts] = useState<Counts | null>(null)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('/api/stats')
                if (!res.ok) throw new Error('Failed to fetch stats')
                const data = await res.json()
                setCounts(data)
            } catch {
                setCounts({ messages: 0, unread: 0, projects: 0, skills: 0, blogs: 0 })
            }
        }
        load()
    }, [])

    if (!counts) return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
             {[1, 2, 3, 4].map((i) => (
                 <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-xl"></div>
             ))}
        </div>
    )

    const cards = [
        {
            label: 'Messages',
            value: counts.messages,
            icon: MessageSquare,
            subtext: `${counts.unread} unread`,
            subtextClass: counts.unread > 0 ? 'text-[#FD4345] font-semibold' : 'text-slate-400',
            color: 'bg-blue-50 text-blue-600'
        },
        {
            label: 'Projects',
            value: counts.projects,
            icon: Briefcase,
            subtext: 'Portfolio Items',
            subtextClass: 'text-slate-400',
            color: 'bg-indigo-50 text-indigo-600'
        },
        {
            label: 'Skills',
            value: counts.skills,
            icon: Wrench,
            subtext: 'Technical Capabilities',
            subtextClass: 'text-slate-400',
            color: 'bg-emerald-50 text-emerald-600'
        },
        {
            label: 'Blog Posts',
            value: counts.blogs,
            icon: FileText,
            subtext: 'Published Articles',
            subtextClass: 'text-slate-400',
            color: 'bg-[#FD4345]/10 text-[#FD4345]'
        }
    ]

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card, index) => (
                <Card key={index} className="border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">
                            {card.label}
                        </CardTitle>
                        <div className={`p-2 rounded-md ${card.color}`}>
                            <card.icon className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{card.value}</div>
                        <p className={`text-xs mt-1 ${card.subtextClass}`}>
                            {card.subtext}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
