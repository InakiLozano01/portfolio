import useSWR from 'swr';
import { ProjectCard } from './ProjectCard';
import { IProject } from '@/models/Project';
import { Types } from 'mongoose';
import { FC } from 'react';

interface ProjectWithPopulatedTech extends Omit<IProject, 'technologies'> {
    _id: Types.ObjectId;
    technologies: Array<{ _id: Types.ObjectId; name: string }>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const ProjectsGrid: FC = () => {
    const { data: projects, error, isLoading } = useSWR<ProjectWithPopulatedTech[]>(
        '/api/projects',
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 3600000, // 1 hour
        }
    );

    if (error) {
        return (
            <div className="text-center text-red-500">
                Failed to load projects. Please try again later.
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="h-[300px] animate-pulse rounded-lg bg-muted"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects?.map((project) => (
                <ProjectCard key={project._id.toString()} project={project} />
            ))}
        </div>
    );
};
