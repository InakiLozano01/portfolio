import { connectToDatabase } from '@/lib/mongodb'
import Project, { IProject } from '@/models/Project'
import { cache } from 'react'
import { Types } from 'mongoose'

interface Skill {
    _id: Types.ObjectId;
    name: string;
    category: string;
    proficiency: number;
    yearsOfExperience: number;
    icon: string;
    createdAt: Date;
    updatedAt: Date;
}

interface PopulatedProject extends Omit<IProject, 'technologies'> {
    _id: Types.ObjectId;
    technologies: Skill[];
}

export const getProjectBySlug = cache(async (slug: string) => {
    await connectToDatabase()

    const project = await Project.findOne({ slug })
        .populate('technologies')
        .lean()
        .exec() as PopulatedProject | null

    if (!project) return null

    return {
        ...project,
        _id: project._id.toString(),
        technologies: project.technologies.map((tech) => ({
            ...tech,
            _id: tech._id.toString()
        }))
    }
}) 