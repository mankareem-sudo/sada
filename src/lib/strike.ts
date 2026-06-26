import { db } from '@/lib/db'

/**
 * Check if a user has an active strike penalty (mute or ban).
 *
 * Strike system rules:
 *  - 1 strike: warning only (no penalty)
 *  - 2 strikes: 24-hour mute
 *  - 3 strikes: 7-day ban
 *  - 4 strikes: 30-day ban
 *  - 5+ strikes: permanent ban
 *
 * Strikes expire after 90 days. Only the latest active penalty applies.
 */
export async function checkUserStrikeStatus(userId: string): Promise<{
  strikeCount: number
  currentPenalty: 'none' | 'mute' | 'ban'
  penaltyEndsAt: string | null
  unacknowledgedCount: number
}> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()

  const warnings = await db.userWarning.findMany({
    where: {
      userId,
      createdAt: { gte: ninetyDaysAgo },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const strikeCount = (warnings as any[]).length
  const unacknowledged = (warnings as any[]).filter((w: any) => !w.isAcknowledged)
  const now = new Date()

  // Find any active penalty (expiresAt in the future)
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
    // Mute = short duration (≤24h) AND user has only 2 strikes
    if (durationHours <= 24 && strikeCount === 2) {
      currentPenalty = 'mute'
    } else {
      currentPenalty = 'ban'
    }
    penaltyEndsAt = activePenalty.expiresAt
  }

  return {
    strikeCount,
    currentPenalty,
    penaltyEndsAt,
    unacknowledgedCount: unacknowledged.length,
  }
}
