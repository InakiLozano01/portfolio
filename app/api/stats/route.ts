import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Contact from '@/models/Contact'
import Project from '@/models/Project'
import Skill from '@/models/Skill'
import BlogModel from '@/models/Blog'
import Comment from '@/models/Comment'
import Subscriber from '@/models/Subscriber'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: Request) {
	try {
		const admin = await requireAdmin(request)
		if (!admin.ok) return admin.response

		await connectToDatabase()

		// One request feeds the whole overview: what needs attention, and what exists.
		const [messagesCount, unreadCount, projectsCount, skillsCount, blogsCount, draftsCount, pendingComments, subscribersCount] = await Promise.all([
			Contact.countDocuments({}),
			Contact.countDocuments({ read: { $ne: true } }),
			Project.countDocuments({}),
			Skill.countDocuments({}),
			BlogModel.countDocuments({}),
			BlogModel.countDocuments({ published: { $ne: true } }),
			Comment.countDocuments({ status: 'pending' }),
			Subscriber.countDocuments({ confirmed: true, unsubscribed: { $ne: true } }),
		])

		return NextResponse.json({
			messages: messagesCount,
			unread: unreadCount,
			projects: projectsCount,
			skills: skillsCount,
			blogs: blogsCount,
			drafts: draftsCount,
			pendingComments,
			subscribers: subscribersCount,
		}, { headers: { 'Cache-Control': 'private, no-store' } })
	} catch (error) {
		console.error('Error fetching stats:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch stats' },
			{ status: 500 }
		)
	}
}
