import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { checkUserStrikeStatus } from '@/lib/strike'

/**
 * POST /api/events/rsvp
 * body: { eventId, status }
 *
 * Sets or updates the current user's RSVP status for an event.
 * status: 'going' | 'maybe' | 'not_going'
 *
 * Returns: { status, counts: { going, maybe, not_going } }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  // Strike check — banned users can't RSVP
  const strike = await checkUserStrikeStatus(user.id)
  if (strike.currentPenalty === 'ban') {
    return NextResponse.json({ error: 'لا يمكنك المشاركة أثناء الحظر' }, { status: 403 })
  }

  const body = await req.json()
  const { eventId, status } = body as { eventId?: string; status?: string }

  if (!eventId || !status) {
    return NextResponse.json({ error: 'missing eventId or status' }, { status: 400 })
  }

  if (!['going', 'maybe', 'not_going'].includes(status)) {
    return NextResponse.json({ error: 'حالة غير صحيحة' }, { status: 400 })
  }

  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event || event.isCancelled) {
    return NextResponse.json({ error: 'الفعالية غير موجودة' }, { status: 404 })
  }

  // Check capacity for 'going' status
  if (status === 'going' && event.capacity) {
    const goingCount = await db.eventRSVP.count({
      where: { eventId, status: 'going' },
    })
    const existingMine = await db.eventRSVP.findFirst({
      where: { eventId, userId: user.id },
    })
    const wasGoing = existingMine?.status === 'going'
    if (!wasGoing && goingCount >= event.capacity) {
      return NextResponse.json({ error: 'الفعالية ممتلئة' }, { status: 400 })
    }
  }

  // Upsert RSVP
  const existing = await db.eventRSVP.findFirst({
    where: { eventId, userId: user.id },
  })

  if (existing) {
    await db.eventRSVP.update({
      where: { id: existing.id },
      data: { status, updatedAt: new Date().toISOString() },
    })
  } else {
    await db.eventRSVP.create({
      data: {
        id: generateId(),
        eventId,
        userId: user.id,
        status,
        createdAt: new Date().toISOString(),
      },
    })
  }

  // Notify event creator (if not their own event)
  if (event.creatorId !== user.id && status === 'going') {
    await db.notification.create({
      data: {
        id: generateId(),
        recipientId: event.creatorId,
        actorId: user.id,
        type: 'system',
        text: `${user.name} سيحضر فعاليتك: ${event.title}`,
        read: false,
        createdAt: new Date().toISOString(),
      },
    }).catch(() => {})
  }

  // Compute new counts
  const allRSVPs = await db.eventRSVP.findMany({
    where: { eventId },
    select: { status: true },
  })
  const counts = { going: 0, maybe: 0, not_going: 0 }
  for (const r of allRSVPs as any[]) {
    if (counts[r.status as keyof typeof counts] !== undefined) counts[r.status as keyof typeof counts]++
  }

  return NextResponse.json({ status, counts })
}
