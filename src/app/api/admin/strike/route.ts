import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/admin/strike
 * body: { userId, reason, category?, severity?, durationHours? }
 *
 * Applies a strike (formal warning) to a user. The strike system:
 *  - 1 strike: warning only (visible in user's banner)
 *  - 2 strikes: 24-hour mute (cannot post/comment)
 *  - 3 strikes: 7-day ban
 *  - 4+ strikes: 30-day ban
 *  - 5+ strikes: permanent ban
 *
 * Admin-only endpoint.
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentUser()
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: 'صلاحيات الإدارة مطلوبة' }, { status: 403 })
  }

  const body = await req.json()
  const { userId, reason, category, severity, durationHours } = body as {
    userId?: string
    reason?: string
    category?: string
    severity?: string
    durationHours?: number
  }

  if (!userId || !reason) {
    return NextResponse.json({ error: 'missing userId or reason' }, { status: 400 })
  }

  const target = await db.user.findUnique({ where: { id: userId } })
  if (!target) {
    return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
  }

  // Create the warning record
  const warning = await db.userWarning.create({
    data: {
      id: generateId(),
      userId,
      reason,
      category: category || 'admin_strike',
      contentType: 'manual',
      contentId: 'admin',
      severity: severity || 'medium',
      isAcknowledged: false,
      createdAt: new Date().toISOString(),
      // expiresAt set below based on strike level
    },
  })

  // Count active strikes (warnings created in last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()
  const allWarnings = await db.userWarning.findMany({
    where: {
      userId,
      createdAt: { gte: ninetyDaysAgo },
    },
    orderBy: { createdAt: 'desc' },
  })

  const strikeCount = (allWarnings as any[]).length

  // Determine penalty based on strike count
  // 1 = warning only, 2 = 24h mute, 3 = 7d ban, 4 = 30d ban, 5+ = permanent
  let penalty: 'none' | 'mute' | 'ban' = 'none'
  let penaltyHours = 0
  let penaltyLabel = 'تحذير فقط'

  if (strikeCount >= 5) {
    penalty = 'ban'
    penaltyHours = 0  // 0 = permanent
    penaltyLabel = 'حظر دائم'
  } else if (strikeCount === 4) {
    penalty = 'ban'
    penaltyHours = 30 * 24
    penaltyLabel = 'حظر 30 يوم'
  } else if (strikeCount === 3) {
    penalty = 'ban'
    penaltyHours = 7 * 24
    penaltyLabel = 'حظر 7 أيام'
  } else if (strikeCount === 2) {
    penalty = 'mute'
    penaltyHours = 24
    penaltyLabel = 'كتم 24 ساعة'
  }

  // Set expiresAt on the warning record itself
  let expiresAt: string | null = null
  if (penaltyHours > 0) {
    expiresAt = new Date(Date.now() + penaltyHours * 3600 * 1000).toISOString()
  } else if (penalty === 'ban' && penaltyHours === 0) {
    // Permanent — expires in 100 years
    expiresAt = new Date(Date.now() + 100 * 365 * 24 * 3600 * 1000).toISOString()
  }
  if (expiresAt) {
    await db.userWarning.update({
      where: { id: warning.id },
      data: { expiresAt },
    }).catch(() => {})
  }

  // Notify the user about the strike
  await db.notification.create({
    data: {
      id: generateId(),
      recipientId: userId,
      actorId: admin.id,
      type: 'system',
      text: `تحذير إداري: ${reason}. العقوبة: ${penaltyLabel}`,
      read: false,
      createdAt: new Date().toISOString(),
    },
  }).catch(() => {})

  return NextResponse.json({
    ok: true,
    warningId: warning.id,
    strikeCount,
    penalty,
    penaltyHours,
    penaltyLabel,
    expiresAt,
  })
}

/**
 * GET /api/admin/strike?userId=xxx
 * Returns the user's current strike status (count + active penalty)
 */
export async function GET(req: NextRequest) {
  const admin = await getCurrentUser()
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: 'صلاحيات الإدارة مطلوبة' }, { status: 403 })
  }

  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'missing userId' }, { status: 400 })
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()
  const warnings = await db.userWarning.findMany({
    where: {
      userId,
      createdAt: { gte: ninetyDaysAgo },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const strikeCount = (warnings as any[]).length
  const unacknowledged = (warnings as any[]).filter((w: any) => !w.isAcknowledged)

  // Determine current active penalty
  const now = new Date()
  const activePenalty = (warnings as any[]).find((w: any) => {
    if (!w.expiresAt) return false
    return new Date(w.expiresAt) > now
  })

  let currentPenalty: 'none' | 'mute' | 'ban' = 'none'
  let penaltyEndsAt: string | null = null
  if (activePenalty) {
    // Heuristic: if expires within 24h of creation → mute, else → ban
    const createdAt = new Date(activePenalty.createdAt)
    const expiresAt = new Date(activePenalty.expiresAt)
    const durationHours = (expiresAt.getTime() - createdAt.getTime()) / (1000 * 3600)
    if (durationHours <= 24 && strikeCount === 2) {
      currentPenalty = 'mute'
    } else {
      currentPenalty = 'ban'
    }
    penaltyEndsAt = activePenalty.expiresAt
  }

  return NextResponse.json({
    userId,
    strikeCount,
    unacknowledgedCount: unacknowledged.length,
    currentPenalty,
    penaltyEndsAt,
    warnings: (warnings as any[]).map((w: any) => ({
      id: w.id,
      reason: w.reason,
      category: w.category,
      severity: w.severity,
      isAcknowledged: w.isAcknowledged,
      createdAt: w.createdAt,
      expiresAt: w.expiresAt,
    })),
  })
}
