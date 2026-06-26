import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser, sanitizeText, detectXSS } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { checkUserStrikeStatus } from '@/lib/strike'

/**
 * POST /api/events/create
 * body: {
 *   circleId?, title, description?, location?, locationType?,
 *   startsAt, endsAt?, capacity?, coverImage?
 * }
 *
 * Creates a new event (optionally scoped to a circle).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  // Strike check
  const strike = await checkUserStrikeStatus(user.id)
  if (strike.currentPenalty === 'ban' || strike.currentPenalty === 'mute') {
    return NextResponse.json({
      error: 'لا يمكنك إنشاء فعاليات أثناء وجود عقوبة',
      penalty: strike.currentPenalty,
    }, { status: 403 })
  }

  const rateCheck = checkRateLimit(req, 'voiceNoteCreate', user.id)
  if (!rateCheck.allowed && rateCheck.response) return rateCheck.response

  const body = await req.json()
  const { circleId, title, description, location, locationType, startsAt, endsAt, capacity, coverImage } = body as {
    circleId?: string
    title?: string
    description?: string
    location?: string
    locationType?: string
    startsAt?: string
    endsAt?: string
    capacity?: number
    coverImage?: string
  }

  if (!title || !startsAt) {
    return NextResponse.json({ error: 'محتاج عنوان وتاريخ بدء' }, { status: 400 })
  }

  const cleanTitle = sanitizeText(title, 120)
  if (detectXSS(cleanTitle)) return NextResponse.json({ error: 'محتوى غير مسموح' }, { status: 400 })

  const cleanDesc = description ? sanitizeText(description, 1000) : null
  const cleanLocation = location ? sanitizeText(location, 200) : null

  const validLocType = ['physical', 'online', 'hybrid'].includes(locationType || '')
    ? locationType! : 'physical'

  const startsAtDate = new Date(startsAt)
  if (isNaN(startsAtDate.getTime())) {
    return NextResponse.json({ error: 'تاريخ بدء غير صحيح' }, { status: 400 })
  }
  if (startsAtDate.getTime() < Date.now() - 3600 * 1000) {
    return NextResponse.json({ error: 'لا يمكن إنشاء فعاليات في الماضي' }, { status: 400 })
  }

  let endsAtDate: string | null = null
  if (endsAt) {
    const d = new Date(endsAt)
    if (isNaN(d.getTime()) || d.getTime() < startsAtDate.getTime()) {
      return NextResponse.json({ error: 'تاريخ انتهاء غير صحيح' }, { status: 400 })
    }
    endsAtDate = d.toISOString()
  }

  if (capacity !== undefined && (capacity < 1 || capacity > 100000)) {
    return NextResponse.json({ error: 'سعة غير صحيحة' }, { status: 400 })
  }

  const event = await db.event.create({
    data: {
      id: generateId(),
      circleId: circleId || null,
      creatorId: user.id,
      title: cleanTitle,
      description: cleanDesc,
      location: cleanLocation,
      locationType: validLocType,
      startsAt: startsAtDate.toISOString(),
      endsAt: endsAtDate,
      capacity: capacity || null,
      coverImage: coverImage || null,
      createdAt: new Date().toISOString(),
    },
  })

  // Auto-RSVP creator as 'going'
  await db.eventRSVP.create({
    data: {
      id: generateId(),
      eventId: event.id,
      userId: user.id,
      status: 'going',
      createdAt: new Date().toISOString(),
    },
  }).catch(() => {})

  return NextResponse.json({ id: event.id, event })
}
