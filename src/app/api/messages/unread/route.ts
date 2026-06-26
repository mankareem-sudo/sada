import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/messages/unread
 * Returns count of unread messages.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const count = await db.message.count({
    where: { receiverId: user.id, read: false },
  })

  return NextResponse.json({ unreadCount: count })
}
