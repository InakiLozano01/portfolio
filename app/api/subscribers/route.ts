import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Subscriber from '@/models/Subscriber'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: Request) {
    try {
        const admin = await requireAdmin(request)
        if (!admin.ok) return admin.response

        await connectToDatabase()
        // Unsubscribe and confirmation tokens stay on the server.
        const subscribers = await Subscriber.find({})
            .select('email language unsubscribed confirmed confirmedAt createdAt')
            .sort({ createdAt: -1 })
            .lean()
        return NextResponse.json(subscribers, { headers: { 'Cache-Control': 'private, no-store' } })
    } catch (error) {
        console.error('Failed to fetch subscribers', error)
        return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
    }
}
