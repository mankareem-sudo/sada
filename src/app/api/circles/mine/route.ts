import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/circles/mine
 *
 * Returns Voice Circles the current user is a member of.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const memberships = await db.voiceCircleMember.findMany({
      where: { userId: user.id },
      select: { circleId: true, role: true },
    })

    if (memberships.length === 0) {
      return NextResponse.json({ circles: [] })
    }

    const circleIds = memberships.map((m: any) => m.circleId)
    const circles = await db.voiceCircle.findMany({
      where: { id: { in: circleIds } },
      orderBy: { createdAt: 'desc' },
    })

    const roleMap = new Map(memberships.map((m: any) => [m.circleId, m.role]))

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
        myRole: roleMap.get(c.id),
      })),
    })
  } catch (e) {
    console.error('My circles error', e)
    return NextResponse.json({ error: 'فشل تحميل دوائرك' }, { status: 500 })
  }
}
