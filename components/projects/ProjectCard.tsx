import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { IProject } from '@/models/Project';
import { Types } from 'mongoose';
import { FC } from 'react';

interface ProjectWithPopulatedTech extends Omit<IProject, 'technologies'> {
    technologies: Array<{ _id: Types.ObjectId; name: string }>;
}

interface ProjectCardProps {
    project: ProjectWithPopulatedTech;
}

export const ProjectCard: FC<ProjectCardProps> = ({ project }) => {
    return (
        <Card className="overflow-hidden transition-all hover:shadow-lg">
            <div className="relative aspect-video">
                <Image
                    src={project.thumbnail || '/images/projects/default-project.jpg'}
                    alt={project.thumbnailAlt || project.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform hover:scale-105"
                    priority={project.featured}
                    loading={project.featured ? 'eager' : 'lazy'}
                    quality={80}
                />
            </div>
            <CardContent className="p-4">
                <Link href={`/projects/${project.slug}`}>
                    <h3 className="mb-2 text-xl font-semibold hover:text-primary">
                        {project.title}
                    </h3>
                </Link>
                <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                    {project.subtitle}
                </p>
                <div className="flex flex-wrap gap-2">
                    {project.technologies?.map((tech) => (
                        <Badge key={tech._id.toString()} variant="secondary">
                            {tech.name}
                        </Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}; 