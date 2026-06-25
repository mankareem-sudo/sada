import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/admin/moderation-queue?status=pending|approved|removed|warned&limit=20
 *
 * Returns flagged content for admin review.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const url = new URL(req.url)
    const status = url.searchParams.get('status') || 'pending'
    const limit = Math.min(Number(url.searchParams.get('limit') || 20), 50)

    const logs = await db.moderationLog.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Enrich with user info
    const userIds = [...new Set((logs as any[]).map((l: any) => l.userId))]
    const users = userIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            username: true,
            name: true,
            avatarColor: true,
            avatarUrl: true,
          },
        })
      : []
    const userMap = new Map((users as any[]).map((u: any) => [u.id, u]))

    // Get warning counts per user
    const warningCounts: Record<string, number> = {}
    if (userIds.length > 0) {
      for (const uid of userIds) {
        const count = await db.userWarning.count({ where: { userId: uid } })
        warningCounts[uid] = count
      }
    }

    return NextResponse.json({
      queue: (logs as any[]).map((l: any) => ({
        id: l.id,
        contentType: l.contentType,
        contentId: l.contentId,
        text: l.text,
        severity: l.severity,
        categories: l.categories ? l.categories.split(',') : [],
        action: l.action,
        explanation: l.explanation,
        model: l.model,
        aiUsed: l.aiUsed,
        status: l.status,
        reviewedBy: l.reviewedBy,
        reviewedAt: l.reviewedAt,
        createdAt: l.createdAt,
        user: userMap.get(l.userId),
        userWarnings: warningCounts[l.userId] || 0,
      })),
    })
  } catch (e) {
    console.error('Moderation queue fetch error', e)
    return NextResponse.json({ error: 'فشل تحميل قائمة المراجعة' }, { status: 500 })
  }
}
