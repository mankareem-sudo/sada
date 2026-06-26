import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/comments/pin
 * body: { commentId, postId, pinned: boolean }
 *
 * Pins or unpins a comment. Only the post author or admins can pin.
 * A post can have at most ONE pinned comment.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const body = await req.json()
  const { commentId, postId, pinned } = body as {
    commentId?: string
    postId?: string
    pinned?: boolean
  }

  if (!commentId || !postId) {
    return NextResponse.json({ error: 'missing commentId or postId' }, { status: 400 })
  }

  // Verify post exists and user is the author (or admin)
  const post = await db.post.findUnique({ where: { id: postId } })
  if (!post) {
    return NextResponse.json({ error: 'المنشور غير موجود' }, { status: 404 })
  }

  const isOwner = post.userId === user.id
  if (!isOwner && !user.isAdmin) {
    return NextResponse.json({ error: 'فقط صاحب المنشور يمكنه تثبيت التعليقات' }, { status: 403 })
  }

  // Verify comment exists and belongs to this post
  const comment = await db.postComment.findUnique({ where: { id: commentId } })
  if (!comment || comment.postId !== postId) {
    return NextResponse.json({ error: 'التعليق غير موجود' }, { status: 404 })
  }

  const shouldPin = pinned === undefined ? !comment.isPinned : !!pinned

  if (shouldPin) {
    // Unpin any previously pinned comment on this post (only one allowed)
    const existingPinned = await db.postComment.findMany({
      where: { postId, isPinned: true },
      select: { id: true },
    })
    for (const c of existingPinned as any[]) {
      await db.postComment.update({ where: { id: c.id }, data: { isPinned: false } }).catch(() => {})
    }
  }

  await db.postComment.update({
    where: { id: commentId },
    data: { isPinned: shouldPin },
  })

  return NextResponse.json({
    pinned: shouldPin,
    commentId,
  })
}
