import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/notifications
 * Returns current user's notifications, newest first.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 100)

  const notifications = await db.notification.findMany({
    where: { recipientId: user.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      actor: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarColor: true,
        },
      },
    },
  })

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      text: n.text,
      read: n.read,
      createdAt: n.createdAt,
      voiceNoteId: n.voiceNoteId,
      actor: n.actor,
    })),
  })
}
