import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeText, detectXSS } from '@/lib/auth'

const EDIT_WINDOW_MINUTES = 15

/**
 * PATCH /api/posts/comments/edit
 * body: { id, content }
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
    return NextResponse.json({ error: `انتهت مدة التعديل` }, { status: 400 })
  }

  const clean = sanitizeText(content, 500)
  if (detectXSS(clean)) return NextResponse.json({ error: 'محتوى غير مسموح' }, { status: 400 })

  await db.postComment.update({ where: { id }, data: { content: clean, isEdited: true } })
  return NextResponse.json({ ok: true, content: clean, isEdited: true })
}
