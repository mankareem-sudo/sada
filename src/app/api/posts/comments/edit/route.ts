import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeText, detectXSS } from '@/lib/auth'
import { moderateWithAI, shouldAutoHide } from '@/lib/ai-moderation'

const EDIT_WINDOW_MINUTES = 15

/**
 * PATCH /api/posts/comments/edit
 * body: { id, content }
 *
 * Edits a comment's content. Rules:
 *  - Only the comment author can edit
 *  - Edit window: 15 minutes from creation
 *  - Sets editedAt timestamp (shown as "معدّل" badge in UI)
 *  - Re-runs AI moderation on new content
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const body = await req.json()
  const { id, content } = body as { id?: string; content?: string }
  if (!id || !content) return NextResponse.json({ error: 'missing params' }, { status: 400 })

  const comment = await db.postComment.findUnique({ where: { id } })
  if (!comment || comment.userId !== user.id) {
    return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  }

  const createdAt = new Date(comment.createdAt).getTime()
  if (Date.now() - createdAt > EDIT_WINDOW_MINUTES * 60 * 1000) {
    return NextResponse.json({ error: `انتهت مدة التعديل (${EDIT_WINDOW_MINUTES} دقيقة)` }, { status: 400 })
  }

  const clean = sanitizeText(content, 500)
  if (detectXSS(clean)) return NextResponse.json({ error: 'محتوى غير مسموح' }, { status: 400 })

  // Re-run AI moderation on edited content
  const aiResult = await moderateWithAI(clean)
  if (aiResult.action === 'block' || shouldAutoHide(aiResult)) {
    return NextResponse.json(
      { error: 'المحتوى المعدّل مخالف لسياسة المنصة', reasons: aiResult.categories },
      { status: 422 }
    )
  }

  await db.postComment.update({
    where: { id },
    data: {
      content: clean,
      editedAt: new Date().toISOString(),
    },
  })
  return NextResponse.json({
    ok: true,
    content: clean,
    editedAt: new Date().toISOString(),
  })
}
