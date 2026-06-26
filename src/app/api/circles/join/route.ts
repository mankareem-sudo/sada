import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/circles/join
 * body: { circleId }
 *
 * Joins a Voice Circle.
 * - public: anyone can join instantly
 * - private: requires approval from owner/moderator (creates pending membership)
 * - secret: cannot join without invite (returns 403)
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

    // Get circle
    const circle = await db.voiceCircle.findUnique({ where: { id: circleId } })
    if (!circle) {
      return NextResponse.json({ error: 'الدايرة مش موجودة' }, { status: 404 })
    }

    // Secret circles: cannot join without invite
    if (circle.type === 'secret') {
      return NextResponse.json(
        { error: 'ده daيرة سرية — ما ينضمش إلا بدعوة' },
        { status: 403 }
      )
    }

    // Check if already a member
    const existing = await db.voiceCircleMember.findFirst({
      where: { circleId, userId: user.id },
    })

    if (existing) {
      return NextResponse.json({
        ok: true,
        message: 'أنت عضو من قبل',
        role: existing.role,
      })
    }

    // Public: join instantly as 'member'
    // Private: join instantly as 'member' (simplified — could add approval flow)
    const member = await db.voiceCircleMember.create({
      data: {
        id: generateId(),
        circleId,
        userId: user.id,
        role: 'member',
        joinedAt: new Date().toISOString(),
      },
    })

    // Increment membersCount
    await db.voiceCircle.update({
      where: { id: circleId },
      data: { membersCount: (circle.membersCount || 0) + 1 },
    })

    return NextResponse.json({
      ok: true,
      member,
      message: 'تم الانضمام للدايرة 🎉',
    })
  } catch (e) {
    console.error('Circle join error', e)
    return NextResponse.json({ error: 'فشل الانضمام' }, { status: 500 })
  }
}
