import { cache } from 'react'
import { connectToDatabase } from '@/lib/mongodb'
import Project, { IProject } from '@/models/Project'
import { Types } from 'mongoose'
import { slugify } from '@/lib/utils'

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

export const getProjectBySlug = async (slug: string) => {
    await connectToDatabase()

    const normalizedSlug = slug?.toString().trim().toLowerCase()

    let project = await Project.findOne({ slug: normalizedSlug })
        .populate('technologies')
        .lean()
        .exec() as PopulatedProject | null

    if (!project && normalizedSlug) {
        // Fallback: try to match by slug case-insensitively or by slugified titles
        const candidates = await Project.find({
            $or: [
                { slug: { $regex: `^${normalizedSlug}$`, $options: 'i' } },
                { title: { $exists: true } },
                { title_en: { $exists: true } },
                { title_es: { $exists: true } },
                { slug: { $regex: normalizedSlug, $options: 'i' } },
            ],
        })
            .populate('technologies')
            .lean()
            .exec()
            .then((rows) => rows as unknown as PopulatedProject[])

        project = candidates.find((p: PopulatedProject) => {
            const slugs = [
                p.slug,
                slugify(p.title || ''),
                slugify((p as any).title_en || ''),
                slugify((p as any).title_es || ''),
            ]
                .filter(Boolean)
                .map((s) => s.toLowerCase())
            return slugs.includes(normalizedSlug)
        }) || null
    }

    if (!project) {
        console.warn('[projects] not found for slug', normalizedSlug)
        return null
    }

    return {
        ...project,
        _id: project._id.toString(),
        technologies: project.technologies.map((tech) => ({
            ...tech,
            _id: tech._id.toString()
        }))
    }
}

export const getAllProjects = cache(async () => {
    await connectToDatabase()

    const projects = await Project.find({ published: true })
        .select('slug updatedAt')
        .lean()
        .exec()

    return projects.map(project => ({
        slug: project.slug,
        lastModified: project.updatedAt
    }))
}) 
