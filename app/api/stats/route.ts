import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Contact from '@/models/Contact'
import Project from '@/models/Project'
import Skill from '@/models/Skill'
import BlogModel from '@/models/Blog'

export async function GET() {
	try {
		await connectToDatabase()

		// Use countDocuments for efficient counting
		const [messagesCount, unreadCount, projectsCount, skillsCount, blogsCount] = await Promise.all([
			Contact.countDocuments({}),
			Contact.countDocuments({ read: { $ne: true } }),
			Project.countDocuments({}),
			Skill.countDocuments({}),
			BlogModel.countDocuments({}),
		])

		return NextResponse.json({
			messages: messagesCount,
			unread: unreadCount,
			projects: projectsCount,
			skills: skillsCount,
			blogs: blogsCount,
		})
	} catch (error) {
		console.error('Error fetching stats:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch stats' },
			{ status: 500 }
		)
	}
}
