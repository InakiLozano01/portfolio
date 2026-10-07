import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { connectToDatabase } from '@/lib/mongodb'
import Admin from '@/models/Admin'
import { hit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const adminGuard = await requireAdmin(request)
    if (!adminGuard.ok) return adminGuard.response

    if (!hit(`password:${adminGuard.session.user?.email}`, 5, 15 * 60 * 1000).ok) {
      return NextResponse.json({ error: 'Too many attempts. Wait 15 minutes and try again.' }, { status: 429 })
    }

    const { currentPassword, newPassword } = await request.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 200) {
      return NextResponse.json({ error: 'Use at least 12 characters' }, { status: 400 })
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ error: 'Choose a password you have not used here' }, { status: 400 })
    }

    await connectToDatabase()
    const admin = await Admin.findOne({ email: adminGuard.session.user?.email })
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    const ok = await admin.comparePassword(currentPassword)
    if (!ok) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    admin.password = newPassword
    admin.passwordChangedAt = new Date()
    await admin.save()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password change failed:', error)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
