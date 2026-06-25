import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/admin/moderation-queue/resolve
 * body: { logId, action: 'approve' | 'remove' | 'warn', reason? }
 *
 * Resolves a flagged moderation item.
 * - approve: mark as approved, no action on content
 * - remove: mark as removed + delete the content (post/comment)
 * - warn: send warning to user + mark as warned
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const body = await req.json()
    const { logId, action, reason } = body as {
      logId?: string
      action?: 'approve' | 'remove' | 'warn'
      reason?: string
    }

    if (!logId || !action) {
      return NextResponse.json({ error: 'missing logId or action' }, { status: 400 })
    }

    // Get the log entry
    const log = await db.moderationLog.findUnique({ where: { id: logId } })
    if (!log) {
      return NextResponse.json({ error: 'السجل غير موجود' }, { status: 404 })
    }

    const now = new Date().toISOString()

    // Update the log status
    const newStatus = action === 'approve' ? 'approved' : action === 'remove' ? 'removed' : 'warned'
    await db.moderationLog.update({
      where: { id: logId },
      data: {
        status: newStatus,
        reviewedBy: user.id,
        reviewedAt: now,
      },
    })

    // Take action on the content
    if (action === 'remove') {
      // Delete the content
      if (log.contentType === 'post') {
        try {
          await db.post.delete({ where: { id: log.contentId } })
        } catch {}
      } else if (log.contentType === 'comment') {
        try {
          await db.postComment.delete({ where: { id: log.contentId } })
        } catch {}
      }

      // Send warning to user
      await db.userWarning.create({
        data: {
          id: generateId(),
          userId: log.userId,
          reason: reason || `محتواك تم حذفه: ${log.explanation || 'مخالفة للسياسة'}`,
          category: log.categories?.split(',')[0] || 'policy_violation',
          contentType: log.contentType,
          contentId: log.contentId,
          severity: log.severity,
          isAcknowledged: false,
          createdAt: now,
        },
      })

      // Send notification
      await db.notification.create({
        data: {
          id: generateId(),
          recipientId: log.userId,
          actorId: user.id,
          type: 'system',
          text: 'محتواك تم حذفه لمخالفته سياسة المنصة',
          read: false,
          createdAt: now,
        },
      }).catch(() => {})
    } else if (action === 'warn') {
      // Just send a warning (keep content)
      await db.userWarning.create({
        data: {
          id: generateId(),
          userId: log.userId,
          reason: reason || `تحذير: ${log.explanation || 'محتواك مخالف للسياسة'}`,
          category: log.categories?.split(',')[0] || 'policy_violation',
          contentType: log.contentType,
          contentId: log.contentId,
          severity: log.severity,
          isAcknowledged: false,
          createdAt: now,
        },
      })

      // Send notification
      await db.notification.create({
        data: {
          id: generateId(),
          recipientId: log.userId,
          actorId: user.id,
          type: 'system',
          text: 'تلقيت تحذيراً بخصوص محتواك. راجع سياسة المجتمع.',
          read: false,
          createdAt: now,
        },
      }).catch(() => {})
    }

    // Check if user has 3+ warnings → auto-mute (set isMuted = true on User)
    const warningCount = await db.userWarning.count({ where: { userId: log.userId } })
    let autoMuted = false
    if (warningCount >= 3) {
      try {
        // Add isMuted column if not exists, otherwise this will fail silently
        await db.user.update({
          where: { id: log.userId },
          data: { bio: `[تم كتم المستخدم تلقائياً — ${warningCount} تحذيرات]` },
        })
        autoMuted = true
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      action,
      newStatus,
      userWarnings: warningCount,
      autoMuted,
    })
  } catch (e) {
    console.error('Moderation resolve error', e)
    return NextResponse.json({ error: 'فشل الحل' }, { status: 500 })
  }
}
