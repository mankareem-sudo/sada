import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { moderateWithAI } from '@/lib/ai-moderation'
import { generateId } from '@/lib/db'

/**
 * POST /api/moderation/scan
 * body: { limit?: number }
 *
 * Scans recent posts + comments that haven't been moderated yet.
 * Logs results to ModerationLog table.
 * Flags severe violations for admin review.
 *
 * This can be called:
 * - Manually by admin
 * - Via cron job (every 5 min)
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin or internal token
    const authHeader = req.headers.get('authorization')
    const internalToken = process.env.SADA_API_TOKEN || 'sada-internal-token-2026'
    if (authHeader !== `Bearer ${internalToken}`) {
      const { getCurrentUser } = await import('@/lib/auth')
      const user = await getCurrentUser()
      if (!user?.isAdmin) {
        return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
      }
    }

    const body = await req.json().catch(() => ({}))
    const limit = Math.min(body.limit || 20, 50)

    let scanned = 0
    let flagged = 0
    let blocked = 0
    let warnings = 0

    // === Scan recent posts ===
    const recentPosts = await db.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    for (const post of recentPosts as any[]) {
      if (!post.content || post.content.trim().length === 0) continue

      // Check if already moderated
      const existing = await db.moderationLog.findFirst({
        where: { contentType: 'post', contentId: post.id },
      })
      if (existing) continue

      scanned++
      const result = await moderateWithAI(post.content)

      // Log the result
      await db.moderationLog.create({
        data: {
          id: generateId(),
          contentType: 'post',
          contentId: post.id,
          userId: post.userId,
          text: post.content.slice(0, 2000),
          severity: result.severity,
          categories: result.categories.join(','),
          action: result.action,
          explanation: result.explanation.slice(0, 500),
          model: result.model,
          aiUsed: result.aiUsed,
          status: result.action === 'block' ? 'pending' : (result.action === 'flag' ? 'pending' : 'approved'),
          createdAt: new Date().toISOString(),
        },
      })

      if (result.action === 'block') {
        blocked++
        // Create warning for user
        await db.userWarning.create({
          data: {
            id: generateId(),
            userId: post.userId,
            reason: `محتوى مخالف: ${result.explanation}`,
            category: result.categories[0] || 'policy_violation',
            contentType: 'post',
            contentId: post.id,
            severity: result.severity,
            isAcknowledged: false,
            createdAt: new Date().toISOString(),
          },
        })
        warnings++
      } else if (result.action === 'flag') {
        flagged++
      }

      // Rate limit: 500ms between AI calls
      await new Promise((r) => setTimeout(r, 500))
    }

    // === Scan recent comments ===
    const recentComments = await db.postComment.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    for (const comment of recentComments as any[]) {
      if (!comment.content || comment.content.trim().length === 0) continue

      const existing = await db.moderationLog.findFirst({
        where: { contentType: 'comment', contentId: comment.id },
      })
      if (existing) continue

      scanned++
      const result = await moderateWithAI(comment.content)

      await db.moderationLog.create({
        data: {
          id: generateId(),
          contentType: 'comment',
          contentId: comment.id,
          userId: comment.userId,
          text: comment.content.slice(0, 2000),
          severity: result.severity,
          categories: result.categories.join(','),
          action: result.action,
          explanation: result.explanation.slice(0, 500),
          model: result.model,
          aiUsed: result.aiUsed,
          status: result.action === 'block' ? 'pending' : (result.action === 'flag' ? 'pending' : 'approved'),
          createdAt: new Date().toISOString(),
        },
      })

      if (result.action === 'block') {
        blocked++
        await db.userWarning.create({
          data: {
            id: generateId(),
            userId: comment.userId,
            reason: `تعليق مخالف: ${result.explanation}`,
            category: result.categories[0] || 'policy_violation',
            contentType: 'comment',
            contentId: comment.id,
            severity: result.severity,
            isAcknowledged: false,
            createdAt: new Date().toISOString(),
          },
        })
        warnings++
      } else if (result.action === 'flag') {
        flagged++
      }

      await new Promise((r) => setTimeout(r, 500))
    }

    return NextResponse.json({
      scanned,
      flagged,
      blocked,
      warnings,
      message: `تم فحص ${scanned} عنصر. ${flagged} للمراجعة. ${blocked} محظور. ${warnings} تحذيرات.`,
    })
  } catch (e) {
    console.error('Moderation scan error', e)
    return NextResponse.json({ error: 'فشل الفحص' }, { status: 500 })
  }
}
