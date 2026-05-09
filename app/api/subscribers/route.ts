import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Subscriber from '@/models/Subscriber'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: Request) {
    try {
        const admin = await requireAdmin(request)
        if (!admin.ok) return admin.response

        await connectToDatabase()
        const subscribers = await Subscriber.find({}).sort({ createdAt: -1 }).lean()
        return NextResponse.json(subscribers)
    } catch (error) {
        console.error('Failed to fetch subscribers', error)
        return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
    }
}
