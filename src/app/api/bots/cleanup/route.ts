import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/bots/cleanup
 *
 * Deletes all bot-generated content:
 * - Posts by bot users
 * - Comments by bot users
 * - Likes by bot users
 * - Post likes by bot users
 * - Notifications triggered by bots
 *
 * Keeps the bot users themselves (so we don't need to re-seed).
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const internalToken = process.env.SADA_API_TOKEN || 'sada-internal-token-2026'
    if (authHeader !== `Bearer ${internalToken}`) {
      const { getCurrentUser } = await import('@/lib/auth')
      const user = await getCurrentUser()
      if (!user?.isAdmin) {
        return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
      }
    }

    // Get all bot user IDs
    const bots = await db.user.findMany({
      where: { email: { contains: '@sada-bots.local' } },
      select: { id: true },
    })
    const botIds = (bots as any[]).map((b: any) => b.id)

    if (botIds.length === 0) {
      return NextResponse.json({ error: 'مفيش بوتات' })
    }

    let deletedPosts = 0
    let deletedComments = 0
    let deletedPostLikes = 0
    let deletedLikes = 0
    let deletedNotifications = 0

    // 1. Delete post likes by bots
    const postLikes = await db.postLike.findMany({
      where: { userId: { in: botIds } },
      select: { id: true },
    })
    for (const pl of postLikes as any[]) {
      try {
        await db.postLike.delete({ where: { id: pl.id } })
        deletedPostLikes++
      } catch {}
    }

    // 2. Delete voice note likes by bots
    const likes = await db.like.findMany({
      where: { userId: { in: botIds } },
      select: { id: true },
    })
    for (const l of likes as any[]) {
      try {
        await db.like.delete({ where: { id: l.id } })
        deletedLikes++
      } catch {}
    }

    // 3. Delete comments by bots
    const comments = await db.postComment.findMany({
      where: { userId: { in: botIds } },
      select: { id: true },
    })
    for (const c of comments as any[]) {
      try {
        await db.postComment.delete({ where: { id: c.id } })
        deletedComments++
      } catch {}
    }

    // 4. Delete posts by bots
    const posts = await db.post.findMany({
      where: { userId: { in: botIds } },
      select: { id: true },
    })
    for (const p of posts as any[]) {
      try {
        await db.post.delete({ where: { id: p.id } })
        deletedPosts++
      } catch {}
    }

    // 5. Delete notifications from bots
    const notifs = await db.notification.findMany({
      where: { actorId: { in: botIds } },
      select: { id: true },
    })
    for (const n of notifs as any[]) {
      try {
        await db.notification.delete({ where: { id: n.id } })
        deletedNotifications++
      } catch {}
    }

    return NextResponse.json({
      success: true,
      deletedPosts,
      deletedComments,
      deletedPostLikes,
      deletedLikes,
      deletedNotifications,
      totalBots: botIds.length,
    })
  } catch (e) {
    console.error('Cleanup error', e)
    return NextResponse.json({ error: 'فشل التنظيف' }, { status: 500 })
  }
}
