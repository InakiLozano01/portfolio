import { connectToDatabase } from '@/lib/mongodb'
import Skill from '@/models/Skill'

export interface SkillSummary {
    _id: string
    name: string
    category: string
    icon: string
}

/** Public skill list for server-seeding the home page (same query as GET /api/skills). */
export const getSkillSummaries = async (): Promise<SkillSummary[]> => {
    if (process.env.SKIP_DB_DURING_BUILD === 'true') return []
    await connectToDatabase()
    const skills = await Skill.find({})
        .select('name category icon')
        .sort({ category: 1, name: 1 })
        .lean()
        .exec()
    return JSON.parse(JSON.stringify(skills))
}
