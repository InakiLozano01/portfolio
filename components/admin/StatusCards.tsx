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
                const [messagesRes, projectsRes, skillsRes, blogsRes] = await Promise.all([
                    fetch('/api/messages'),
                    fetch('/api/projects'),
                    fetch('/api/skills'),
                    fetch('/api/blogs')
                ])
                const [messages, projects, skills, blogs] = await Promise.all([
                    messagesRes.json(), projectsRes.json(), skillsRes.json(), blogsRes.json()
                ])
                const unread = Array.isArray(messages) ? messages.filter((m: any) => !m.read).length : 0
                setCounts({
                    messages: Array.isArray(messages) ? messages.length : 0,
                    unread,
                    projects: Array.isArray(projects) ? projects.length : 0,
                    skills: Array.isArray(skills) ? skills.length : 0,
                    blogs: Array.isArray(blogs) ? blogs.length : 0,
                })
            } catch {
                setCounts({ messages: 0, unread: 0, projects: 0, skills: 0, blogs: 0 })
            }
        }
        load()
    }, [])

    if (!counts) return null

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-blue-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                        <MessageSquare className="w-5 h-5" /> Messages
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-bold text-blue-900">{counts.messages}
                    <span className="ml-2 text-sm text-blue-600 font-medium">{counts.unread} unread</span>
                </CardContent>
            </Card>
            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                        <Briefcase className="w-5 h-5" /> Projects
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-bold text-red-900">{counts.projects}</CardContent>
            </Card>
            <Card className="border-blue-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                        <Wrench className="w-5 h-5" /> Skills
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-bold text-blue-900">{counts.skills}</CardContent>
            </Card>
            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                        <FileText className="w-5 h-5" /> Blogs
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-bold text-red-900">{counts.blogs}</CardContent>
            </Card>
        </div>
    )
}


