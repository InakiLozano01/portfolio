'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { IProject } from '@/models/Project'
import type { Document, Types } from 'mongoose'

interface Skill extends Document {
    _id: Types.ObjectId;
    name: string;
    category: string;
    proficiency: number;
    yearsOfExperience: number;
    icon: string;
}

interface ProjectWithTechnologies extends Omit<IProject, 'technologies'> {
    _id: Types.ObjectId;
    technologies: Skill[];
}

export default function Projects() {
    const [projects, setProjects] = useState<ProjectWithTechnologies[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch('/api/projects')
                if (!response.ok) throw new Error('Failed to fetch projects')
                const data = await response.json()
                setProjects(data)
            } catch (err) {
                setError('Failed to load projects')
                console.error('Error loading projects:', err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchProjects()
    }, [])

    if (isLoading) {
        return (
            <section id="projects" className="container mx-auto px-4 py-16">
                <h2 className="text-3xl font-bold mb-8 text-primary">Projects</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="h-48 bg-gray-200 dark:bg-gray-700" />
                            <CardContent className="space-y-4">
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                                <div className="flex gap-2">
                                    {[1, 2, 3].map((j) => (
                                        <div
                                            key={j}
                                            className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        )
    }

    if (error) {
        return (
            <section id="projects" className="container mx-auto px-4 py-16">
                <h2 className="text-3xl font-bold mb-8 text-primary">Projects</h2>
                <div className="text-center text-red-500">{error}</div>
            </section>
        )
    }

    return (
        <section id="projects" className="container mx-auto px-4 py-16">
            <h2 className="text-3xl font-bold mb-8 text-primary">Projects</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-rows-fr gap-6">
                {projects.map((project) => (
                    <Link
                        key={project._id.toString()}
                        href={`/projects/${project.slug}`}
                        className="transition-transform hover:scale-105"
                    >
                        <Card className="h-full flex flex-col">
                            <div className="relative aspect-video w-full">
                                <Image
                                    src={project.thumbnail || '/images/projects/default-project.jpg'}
                                    alt={project.title}
                                    fill
                                    className="object-cover rounded-t-lg"
                                />
                            </div>
                            <CardHeader className="flex-grow">
                                <CardTitle className="line-clamp-1">{project.title}</CardTitle>
                                <p className="text-sm text-muted-foreground line-clamp-2">{project.subtitle}</p>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {project.technologies.map((tech) => (
                                        <Badge
                                            key={tech._id.toString()}
                                            variant="outline"
                                            className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                                        >
                                            {tech.name}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </section>
    )
} 