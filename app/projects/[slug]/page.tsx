'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Github } from 'lucide-react'
import { IProject } from '@/models/Project'
import { Skill } from '@/models/Skill'

interface ProjectPageProps {
    params: {
        slug: string
    }
}

export default function ProjectPage({ params }: ProjectPageProps) {
    const [project, setProject] = useState<(IProject & { technologies: Skill[] }) | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const response = await fetch(`/api/projects/slug/${params.slug}`)
                if (!response.ok) throw new Error('Failed to fetch project')
                const data = await response.json()
                setProject(data)
            } catch (err) {
                setError('Failed to load project')
                console.error('Error loading project:', err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchProject()
    }, [params.slug])

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="animate-pulse space-y-8">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                    <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="space-y-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
                    </div>
                </div>
            </div>
        )
    }

    if (error || !project) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center text-red-500">
                    {error || 'Project not found'}
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-4">{project.title}</h1>
                <p className="text-xl text-muted-foreground mb-6">{project.subtitle}</p>

                {project.thumbnail && (
                    <div className="relative h-[400px] w-full mb-8">
                        <Image
                            src={project.thumbnail}
                            alt={project.title}
                            fill
                            className="object-cover rounded-lg"
                        />
                    </div>
                )}

                <div className="flex flex-wrap gap-2 mb-6">
                    {project.technologies.map((tech) => (
                        <Badge key={tech._id} variant="secondary">
                            {tech.name}
                        </Badge>
                    ))}
                </div>

                {project.githubUrl && (
                    <Link
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mb-8 text-primary hover:text-primary/80"
                    >
                        <Github size={20} />
                        View on GitHub
                    </Link>
                )}

                <Card className="p-6">
                    <div
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: project.description }}
                    />
                </Card>
            </div>
        </div>
    )
} 