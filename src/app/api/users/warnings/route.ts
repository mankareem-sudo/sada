import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/users/warnings
 *
 * Returns the current user's warnings (acknowledged + unacknowledged).
 * Also returns count of unacknowledged warnings for showing a banner.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const warnings = await db.userWarning.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const unacknowledged = (warnings as any[]).filter((w: any) => !w.isAcknowledged)

    return NextResponse.json({
      warnings: (warnings as any[]).map((w: any) => ({
        id: w.id,
        reason: w.reason,
        category: w.category,
        contentType: w.contentType,
        contentId: w.contentId,
        severity: w.severity,
        isAcknowledged: w.isAcknowledged,
        createdAt: w.createdAt,
      })),
      unacknowledgedCount: unacknowledged.length,
      total: (warnings as any[]).length,
    })
  } catch (e) {
    console.error('User warnings fetch error', e)
    return NextResponse.json({ error: 'فشل تحميل التحذيرات' }, { status: 500 })
  }
}

/**
 * POST /api/users/warnings
 * body: { warningId }
 *
 * Acknowledges a warning (dismisses it from the banner).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const body = await req.json()
    const { warningId } = body as { warningId?: string }

    if (!warningId) {
      return NextResponse.json({ error: 'missing warningId' }, { status: 400 })
    }

    // Verify ownership
    const warning = await db.userWarning.findUnique({ where: { id: warningId } })
    if (!warning || warning.userId !== user.id) {
      return NextResponse.json({ error: 'التحذير غير موجود' }, { status: 404 })
    }

    await db.userWarning.update({
      where: { id: warningId },
      data: { isAcknowledged: true },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Acknowledge warning error', e)
    return NextResponse.json({ error: 'فشل' }, { status: 500 })
  }
}
