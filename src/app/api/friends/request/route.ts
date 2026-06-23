import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/friends/request
 * body: { targetUserId }
 * Sends a friend request.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const rateCheck = checkRateLimit(req, 'like', user.id)
  if (!rateCheck.allowed && rateCheck.response) return rateCheck.response

  const body = await req.json()
  const { targetUserId } = body as { targetUserId?: string }
  if (!targetUserId || targetUserId === user.id) {
    return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
  }

  // Check if already friends or request exists
  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: user.id, addresseeId: targetUserId },
        { requesterId: targetUserId, addresseeId: user.id },
      ],
    },
  })

  if (existing) {
    if (existing.status === 'accepted') {
      return NextResponse.json({ error: 'أنتوا أصدقاء بالفعل' }, { status: 400 })
    }
    return NextResponse.json({ ok: true, alreadyRequested: true })
  }

  // Create friendship request
  await db.friendship.create({
    data: {
      id: generateId(),
      requesterId: user.id,
      addresseeId: targetUserId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  })

  // Notify the addressee
  await db.notification.create({
    data: {
      id: generateId(),
      recipientId: targetUserId,
      actorId: user.id,
      type: 'friend_request',
      text: `بعت ${user.name} طلب صداقة`,
      read: false,
      createdAt: new Date().toISOString(),
    },
  }).catch(() => {})

  return NextResponse.json({ ok: true, status: 'pending' })
}
