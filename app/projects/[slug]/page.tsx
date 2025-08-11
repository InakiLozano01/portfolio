import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Github, ArrowLeft } from 'lucide-react'
import { IProject } from '../../../models/Project'
import mongoose from 'mongoose'
import DOMPurify from 'isomorphic-dompurify'
import { getProjectBySlug } from '../../../lib/projects'
import { notFound } from 'next/navigation'
import BackNavigationHandler from '@/components/BackNavigationHandler'
import ShareActions from '@/components/ShareActions'

interface ISkill {
    _id: mongoose.Types.ObjectId;
    name: string;
    category: string;
    proficiency: number;
    yearsOfExperience: number;
    icon: string;
}

interface ProjectPageProps {
    params: {
        slug: string
    }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
    const project = await getProjectBySlug(params.slug)

    if (!project) {
        notFound()
    }

    return (
        <div className="min-h-screen flex">
            <BackNavigationHandler />
            <div className="hidden lg:block w-32 bg-[#263547]" />
            <article className="container max-w-4xl mx-auto py-8 px-4 flex-1">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-6"
                >
                    <ArrowLeft size={20} />
                    Back to Home
                </Link>

                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-red-500 bg-clip-text text-transparent">
                    {project.title}
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                    <p className="text-xl text-muted-foreground">{project.subtitle}</p>
                    <ShareActions url={`${process.env.NEXT_PUBLIC_APP_URL || ''}/projects/${project.slug}`} title={project.title} />
                </div>

                {project.thumbnail && (
                    <div className="relative w-full mb-8">
                        <Image
                            src={project.thumbnail}
                            alt={project.title}
                            width={1920}
                            height={1080}
                            className="w-full rounded-lg shadow-lg"
                            priority
                            placeholder="blur"
                            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTkyMCcgaGVpZ2h0PScxMDgwJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxyZWN0IGZpbGw9IiNlZWUiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4="
                        />
                    </div>
                )}

                <div className="flex flex-wrap gap-2 mb-8 justify-center border-b border-[#263547]/20 pb-8">
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

                {project.githubUrl && (
                    <div className="mb-8 pb-8 border-b border-[#263547]/20">
                        <Link
                            href={project.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-primary hover:text-primary/80"
                        >
                            <Github size={20} />
                            View on GitHub
                        </Link>
                    </div>
                )}

                <div
                    className="space-y-6 text-muted-foreground"
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(project.description, {
                            ADD_ATTR: ['class'],
                            ALLOWED_TAGS: ['h2', 'h3', 'p', 'ul', 'li', 'img', 'a'],
                            ADD_TAGS: ['style']
                        }).replace(
                            /<h2>/g,
                            '<h2 class="text-2xl font-semibold text-primary mt-8 mb-4">'
                        ).replace(
                            /<h3>/g,
                            '<h3 class="text-xl font-medium text-primary mt-6 mb-3">'
                        ).replace(
                            /<p>/g,
                            '<p class="leading-relaxed">'
                        ).replace(
                            /<ul>/g,
                            '<ul class="list-disc list-inside space-y-2 ml-4">'
                        ).replace(
                            /<img/g,
                            '<img class="rounded-lg shadow-lg my-4 max-w-full h-auto"'
                        )
                    }}
                />
            </article>
            <div className="hidden lg:block w-32 bg-[#263547]" />
        </div>
    )
} 