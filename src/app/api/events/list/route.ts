import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/events/list?circleId=xxx&upcoming=true&limit=20
 *
 * Lists events. Filters:
 *  - circleId: only events in this circle (omit for global)
 *  - upcoming: only events with startsAt > now
 *  - limit: max results (default 20)
 *
 * For each event, includes: creator info, RSVP counts, my RSVP status
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  const url = new URL(req.url)
  const circleId = url.searchParams.get('circleId')
  const upcoming = url.searchParams.get('upcoming') !== 'false'
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)

  const where: any = { isCancelled: false }
  if (circleId) where.circleId = circleId
  else where.circleId = null  // global events only when no circleId specified
  if (upcoming) {
    where.startsAt = { gte: new Date().toISOString() }
  }

  const events = await db.event.findMany({
    where,
    orderBy: { startsAt: 'asc' },
    take: limit,
  })

  if ((events as any[]).length === 0) {
    return NextResponse.json({ events: [] })
  }

  // Fetch creators
  const creatorIds = [...new Set((events as any[]).map((e: any) => e.creatorId))]
  const creators = creatorIds.length > 0
    ? await db.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, username: true, name: true, avatarColor: true, avatarUrl: true },
      })
    : []
  const creatorMap = new Map(creators.map((u: any) => [u.id, u]))

  // Fetch RSVP counts + my status
  const eventIds = (events as any[]).map((e: any) => e.id)
  const allRSVPs = await db.eventRSVP.findMany({
    where: { eventId: { in: eventIds } },
    select: { eventId: true, userId: true, status: true },
  })

  const rsvpCounts: Record<string, { going: number; maybe: number; not_going: number }> = {}
  const myRSVPs: Record<string, string> = {}
  for (const r of allRSVPs as any[]) {
    if (!rsvpCounts[r.eventId]) rsvpCounts[r.eventId] = { going: 0, maybe: 0, not_going: 0 }
    if (rsvpCounts[r.eventId][r.status] !== undefined) {
      rsvpCounts[r.eventId][r.status]++
    }
    if (user && r.userId === user.id) {
      myRSVPs[r.eventId] = r.status
    }
  }

  const result = (events as any[]).map((e: any) => ({
    id: e.id,
    circleId: e.circleId,
    title: e.title,
    description: e.description,
    location: e.location,
    locationType: e.locationType,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    capacity: e.capacity,
    coverImage: e.coverImage,
    isCancelled: e.isCancelled,
    creator: creatorMap.get(e.creatorId),
    rsvpCounts: rsvpCounts[e.id] || { going: 0, maybe: 0, not_going: 0 },
    myRSVP: myRSVPs[e.id] || null,
  }))

  return NextResponse.json({ events: result })
}
