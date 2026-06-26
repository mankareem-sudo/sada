import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeText, detectXSS } from '@/lib/auth'

const EDIT_WINDOW_MINUTES = 15

/**
 * PATCH /api/posts/edit
 * body: { id, content }
 * Edits a post within 15 minutes of creation.
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const body = await req.json()
  const { id, content } = body as { id?: string; content?: string }
  if (!id || !content) return NextResponse.json({ error: 'missing params' }, { status: 400 })

  const post = await db.post.findUnique({ where: { id } })
  if (!post || post.userId !== user.id) {
    return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  }

  // Check 15-minute edit window
  const createdAt = new Date(post.createdAt).getTime()
  const now = Date.now()
  if (now - createdAt > EDIT_WINDOW_MINUTES * 60 * 1000) {
    return NextResponse.json(
      { error: `انتهت مدة التعديل (${EDIT_WINDOW_MINUTES} دقيقة)` },
      { status: 400 }
    )
  }

  const cleanContent = sanitizeText(content, 2000)
  if (detectXSS(cleanContent)) {
    return NextResponse.json({ error: 'محتوى غير مسموح' }, { status: 400 })
  }

  const updated = await db.post.update({
    where: { id },
    data: { content: cleanContent, isEdited: true },
  })

  return NextResponse.json({ ok: true, content: updated.content, isEdited: true })
}
