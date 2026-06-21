import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/follow
 * body: { targetUserId: string, action: 'follow' | 'unfollow' }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const body = await req.json()
  const { targetUserId, action } = body as {
    targetUserId?: string
    action?: 'follow' | 'unfollow'
  }

  if (!targetUserId || !action) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'لازم تتابع حد غيرك' }, { status: 400 })
  }

  const target = await db.user.findUnique({ where: { id: targetUserId } })
  if (!target) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  if (action === 'follow') {
    try {
      await db.follow.create({
        data: { followerId: user.id, followeeId: targetUserId },
      })
      // Notify target
      await db.notification.create({
        data: {
          recipientId: targetUserId,
          actorId: user.id,
          type: 'follow',
          text: `بدأ ${user.name} بمتابعتك`,
          read: false,
        },
      }).catch(() => {})
    } catch {
      // already following
    }
  } else {
    await db.follow.deleteMany({
      where: { followerId: user.id, followeeId: targetUserId },
    })
  }

  const followers = await db.follow.count({ where: { followeeId: targetUserId } })
  return NextResponse.json({
    following: action === 'follow',
    followersCount: followers,
  })
}
