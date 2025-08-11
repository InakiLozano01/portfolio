'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import SkillIcon from '@/components/SkillIcon'
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
    const [techFilter, setTechFilter] = useState<string>('all')
    const [availableTechs, setAvailableTechs] = useState<{ name: string, count: number }[]>([])

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch('/api/projects')
                if (!response.ok) throw new Error('Failed to fetch projects')
                const data = await response.json()
                setProjects(data)
                // collect techs for filters
                const counts = new Map<string, number>()
                data.forEach((p: ProjectWithTechnologies) => p.technologies.forEach(t => {
                    counts.set(t.name, (counts.get(t.name) || 0) + 1)
                }))
                setAvailableTechs(Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)))
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

    const filteredProjects = techFilter === 'all' ? projects : projects.filter(p => p.technologies.some(t => t.name === techFilter))

    return (
        <section id="projects" className="container mx-auto px-4 py-16">
            <h2 className="text-3xl font-bold mb-6 text-primary">Projects</h2>
            <div className="flex flex-wrap gap-2 mb-6">
                <button
                    onClick={() => setTechFilter('all')}
                    className={`px-3 py-2 rounded-full text-sm font-medium ${techFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    All <span className="ml-1 text-xs opacity-70">{projects.length}</span>
                </button>
                {availableTechs.map(t => (
                    <button
                        key={t.name}
                        onClick={() => setTechFilter(t.name)}
                        className={`px-3 py-2 rounded-full text-sm font-medium ${techFilter === t.name ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        {t.name} <span className="ml-1 text-xs opacity-70">{t.count}</span>
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-rows-fr gap-6">
                {filteredProjects.map((project) => (
                    <Link
                        key={project._id.toString()}
                        href={`/projects/${project.slug}`}
                        prefetch={true}
                        className="transition-transform hover:scale-105"
                    >
                        <Card className="h-full flex flex-col hover:bg-primary/5">
                            <div className="relative aspect-video w-full">
                                <Image
                                    src={project.thumbnail || '/images/projects/default-project.jpg'}
                                    alt={`Thumbnail image for project ${project.title}`}
                                    fill
                                    className="object-cover rounded-t-lg"
                                    priority={false}
                                    placeholder="blur"
                                    blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nNjQwJyBoZWlnaHQ9JzM2MCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48cmVjdCBmaWxsPSIjZWVlIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+"
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
                                            className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 inline-flex items-center gap-1"
                                        >
                                            <SkillIcon name={tech.name} icon={tech.icon} size={14} className="w-3.5 h-3.5" />
                                            <span>{tech.name}</span>
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