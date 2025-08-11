import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import Admin from '@/models/Admin'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (typeof newPassword !== 'string' || newPassword.length < 12) {
      return NextResponse.json({ error: 'Weak password' }, { status: 400 })
    }

    await connectToDatabase()
    const admin = await Admin.findOne({ email: session.user.email })
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    const ok = await admin.comparePassword(currentPassword)
    if (!ok) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    const salt = await bcrypt.genSalt(10)
    const hashed = await bcrypt.hash(newPassword, salt)
    admin.password = hashed
    await admin.save()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password change failed:', error)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}


