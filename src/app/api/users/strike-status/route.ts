import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/users/strike-status
 *
 * Returns the current user's strike status — used by the client
 * to show banners / block posting when the user is muted or banned.
 *
 * Returns: { strikeCount, currentPenalty: 'none'|'mute'|'ban', penaltyEndsAt, unacknowledgedCount }
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()
  const warnings = await db.userWarning.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: ninetyDaysAgo },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const strikeCount = (warnings as any[]).length
  const unacknowledged = (warnings as any[]).filter((w: any) => !w.isAcknowledged)
  const now = new Date()

  // Find any active penalty
  const activePenalty = (warnings as any[]).find((w: any) => {
    if (!w.expiresAt) return false
    return new Date(w.expiresAt) > now
  })

  let currentPenalty: 'none' | 'mute' | 'ban' = 'none'
  let penaltyEndsAt: string | null = null
  if (activePenalty) {
    const createdAt = new Date(activePenalty.createdAt)
    const expiresAt = new Date(activePenalty.expiresAt)
    const durationHours = (expiresAt.getTime() - createdAt.getTime()) / (1000 * 3600)
    // Mute = 24h or less AND only 2 strikes; otherwise ban
    if (durationHours <= 24 && strikeCount === 2) {
      currentPenalty = 'mute'
    } else {
      currentPenalty = 'ban'
    }
    penaltyEndsAt = activePenalty.expiresAt
  }

  return NextResponse.json({
    strikeCount,
    currentPenalty,
    penaltyEndsAt,
    unacknowledgedCount: unacknowledged.length,
    latestWarning: unacknowledged[0] || null,
  })
}
