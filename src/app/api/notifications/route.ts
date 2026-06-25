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

  // Fetch notifications (Supabase wrapper doesn't support include+select well)
  const notifications = await db.notification.findMany({
    where: { recipientId: user.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  if (!notifications || (notifications as any[]).length === 0) {
    return NextResponse.json({ notifications: [] })
  }

  // Fetch actor info separately
  const actorIds = [...new Set((notifications as any[]).map((n: any) => n.actorId).filter(Boolean))]
  let actorMap = new Map<string, any>()
  if (actorIds.length > 0) {
    const actors = await db.user.findMany({
      where: { id: { in: actorIds } },
      select: {
        id: true,
        username: true,
        name: true,
        avatarColor: true,
        avatarUrl: true,
        isVerified: true,
      },
    })
    actorMap = new Map((actors as any[]).map((a: any) => [a.id, a]))
  }

  return NextResponse.json({
    notifications: (notifications as any[]).map((n: any) => ({
      id: n.id,
      type: n.type,
      text: n.text,
      read: n.read,
      createdAt: n.createdAt,
      voiceNoteId: n.voiceNoteId,
      actor: n.actorId ? actorMap.get(n.actorId) || null : null,
    })),
  })
}
