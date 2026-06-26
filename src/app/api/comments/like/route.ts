import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/comments/like
 * body: { commentId }
 *
 * Toggles like on a comment (like/unlike).
 * Returns the new like state + updated count.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const body = await req.json()
    const { commentId } = body as { commentId?: string }

    if (!commentId) {
      return NextResponse.json({ error: 'missing commentId' }, { status: 400 })
    }

    // Check comment exists
    const comment = await db.comment.findUnique({ where: { id: commentId } })
    if (!comment) {
      return NextResponse.json({ error: 'التعليق مش موجود' }, { status: 404 })
    }

    // Check if already liked
    const existing = await db.commentLike.findFirst({
      where: { commentId, userId: user.id },
    })

    if (existing) {
      // Unlike
      await db.commentLike.delete({ where: { id: existing.id } })

      // Count remaining
      const remaining = await db.commentLike.findMany({
        where: { commentId },
      })

      return NextResponse.json({
        ok: true,
        liked: false,
        likesCount: (remaining as any[]).length,
      })
    } else {
      // Like
      await db.commentLike.create({
        data: {
          id: generateId(),
          commentId,
          userId: user.id,
          createdAt: new Date().toISOString(),
        },
      })

      // Notify comment owner (if not self)
      if (comment.userId !== user.id) {
        await db.notification.create({
          data: {
            id: generateId(),
            recipientId: comment.userId,
            actorId: user.id,
            type: 'like',
            commentId,
            voiceNoteId: comment.voiceNoteId,
            text: `أعجب ${user.name} بتعليقك`,
            read: false,
            createdAt: new Date().toISOString(),
          },
        }).catch(() => {})
      }

      // Count
      const all = await db.commentLike.findMany({
        where: { commentId },
      })

      return NextResponse.json({
        ok: true,
        liked: true,
        likesCount: (all as any[]).length,
      })
    }
  } catch (e) {
    console.error('Comment like error', e)
    return NextResponse.json({ error: 'فشل الإعجاب بالتعليق' }, { status: 500 })
  }
}
