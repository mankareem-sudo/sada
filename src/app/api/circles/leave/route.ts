import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/circles/leave
 * body: { circleId }
 *
 * Leaves a Voice Circle.
 * Owners cannot leave (must transfer ownership first or delete the circle).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const body = await req.json()
    const { circleId } = body as { circleId?: string }

    if (!circleId) {
      return NextResponse.json({ error: 'missing circleId' }, { status: 400 })
    }

    // Check membership
    const member = await db.voiceCircleMember.findFirst({
      where: { circleId, userId: user.id },
    })

    if (!member) {
      return NextResponse.json({ error: 'أنت مش عضو' }, { status: 400 })
    }

    if (member.role === 'owner') {
      return NextResponse.json(
        { error: 'ما تقدرش تترك الدايرة وأنت المالك — انقل الملكية أو احذف الدايرة' },
        { status: 400 }
      )
    }

    // Remove membership
    await db.voiceCircleMember.delete({ where: { id: member.id } })

    // Decrement membersCount
    const circle = await db.voiceCircle.findUnique({ where: { id: circleId } })
    if (circle) {
      await db.voiceCircle.update({
        where: { id: circleId },
        data: { membersCount: Math.max(0, (circle.membersCount || 0) - 1) },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Circle leave error', e)
    return NextResponse.json({ error: 'فشل مغادرة الدايرة' }, { status: 500 })
  }
}
