import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/comments/hide
 * body: { commentId, postId, hidden: boolean }
 *
 * Hides or unhides a comment. Only the post author can hide a comment
 * (the comment remains visible to its author and the post owner).
 *
 * Hidden comments show a "تم إخفاء هذا التعليق" placeholder for other viewers.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const body = await req.json()
  const { commentId, postId, hidden } = body as {
    commentId?: string
    postId?: string
    hidden?: boolean
  }

  if (!commentId || !postId) {
    return NextResponse.json({ error: 'missing commentId or postId' }, { status: 400 })
  }

  const post = await db.post.findUnique({ where: { id: postId } })
  if (!post) {
    return NextResponse.json({ error: 'المنشور غير موجود' }, { status: 404 })
  }

  // Only post owner OR comment author OR admin can hide
  const comment = await db.postComment.findUnique({ where: { id: commentId } })
  if (!comment || comment.postId !== postId) {
    return NextResponse.json({ error: 'التعليق غير موجود' }, { status: 404 })
  }

  const isPostOwner = post.userId === user.id
  const isCommentAuthor = comment.userId === user.id
  if (!isPostOwner && !isCommentAuthor && !user.isAdmin) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 })
  }

  const shouldHide = hidden === undefined ? !comment.isHidden : !!hidden

  await db.postComment.update({
    where: { id: commentId },
    data: { isHidden: shouldHide },
  })

  return NextResponse.json({
    hidden: shouldHide,
    commentId,
  })
}
