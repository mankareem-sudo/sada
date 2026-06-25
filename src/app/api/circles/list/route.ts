import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/circles/list?type=all|mine|public
 *
 * Returns Voice Circles.
 * - all: public + private circles (excludes secret)
 * - mine: circles the current user is a member of
 * - public: only public circles
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    const url = new URL(req.url)
    const type = url.searchParams.get('type') || 'all'
    const limit = Math.min(Number(url.searchParams.get('limit') || 20), 50)

    let circles: any[] = []

    if (type === 'mine' && user) {
      // Get user's memberships
      const memberships = await db.voiceCircleMember.findMany({
        where: { userId: user.id },
        select: { circleId: true, role: true },
      })
      const circleIds = memberships.map((m: any) => m.circleId)
      if (circleIds.length > 0) {
        circles = await db.voiceCircle.findMany({
          where: { id: { in: circleIds } },
          orderBy: { createdAt: 'desc' },
          take: limit,
        })
      }
      // Attach user's role
      const roleMap = new Map(memberships.map((m: any) => [m.circleId, m.role]))
      circles = circles.map((c: any) => ({ ...c, myRole: roleMap.get(c.id) }))
    } else if (type === 'public') {
      circles = await db.voiceCircle.findMany({
        where: { type: 'public' },
        orderBy: { membersCount: 'desc' },
        take: limit,
      })
    } else {
      // all: public + private (not secret)
      circles = await db.voiceCircle.findMany({
        where: { type: { in: ['public', 'private'] } },
        orderBy: { membersCount: 'desc' },
        take: limit,
      })
    }

    // Enrich with owner info
    const ownerIds = [...new Set(circles.map((c: any) => c.ownerId))]
    const owners = ownerIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, username: true, name: true, avatarColor: true, avatarUrl: true },
        })
      : []
    const ownerMap = new Map((owners as any[]).map((o: any) => [o.id, o]))

    // Check membership for current user
    let myMembershipMap = new Map<string, string>()
    if (user && circles.length > 0) {
      const myMemberships = await db.voiceCircleMember.findMany({
        where: { userId: user.id, circleId: { in: circles.map((c: any) => c.id) } },
        select: { circleId: true, role: true },
      })
      myMembershipMap = new Map((myMemberships as any[]).map((m: any) => [m.circleId, m.role]))
    }

    return NextResponse.json({
      circles: circles.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        type: c.type,
        rules: c.rules,
        coverColor: c.coverColor,
        membersCount: c.membersCount,
        createdAt: c.createdAt,
        owner: ownerMap.get(c.ownerId) || null,
        myRole: myMembershipMap.get(c.id) || null,
        isMember: myMembershipMap.has(c.id),
      })),
    })
  } catch (e) {
    console.error('Circles list error', e)
    return NextResponse.json({ error: 'فشل تحميل الدوائر' }, { status: 500 })
  }
}
