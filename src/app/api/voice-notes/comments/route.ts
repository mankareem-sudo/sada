import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeText, detectXSS } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/voice-notes/comments?voiceNoteId=xxx
 * Returns comments for a voice note, including their replies (one level deep).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const voiceNoteId = url.searchParams.get('voiceNoteId')
  if (!voiceNoteId) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 })
  }
  // Fetch top-level comments only (parentId is null)
  const comments = await db.comment.findMany({
    where: { voiceNoteId, parentId: null },
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarColor: true,
        },
      },
      replies: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              avatarColor: true,
            },
          },
        },
      },
    },
    take: 100,
  })
  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      parentId: c.parentId,
      user: c.user,
      replies: c.replies.map((r) => ({
        id: r.id,
        content: r.content,
        createdAt: r.createdAt,
        parentId: r.parentId,
        user: r.user,
      })),
    })),
  })
}

/**
 * POST /api/voice-notes/comments
 * body: { voiceNoteId, content, parentId? }
 * If parentId is provided, this is a reply to another comment.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  // Rate limit: 30 comments per hour per user
  const rateCheck = checkRateLimit(req, 'comment', user.id)
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }

  const body = await req.json()
  const { voiceNoteId, content, parentId } = body as {
    voiceNoteId?: string
    content?: string
    parentId?: string
  }

  if (!voiceNoteId || !content || !content.trim()) {
    return NextResponse.json({ error: 'محتاج محتوى' }, { status: 400 })
  }

  // Sanitize content
  const trimmed = sanitizeText(content, 500)
  if (trimmed.length < 1) {
    return NextResponse.json({ error: 'التعليق قصير جداً' }, { status: 400 })
  }
  
  // Check for XSS attempts
  if (detectXSS(trimmed)) {
    return NextResponse.json({ error: 'محتوى غير مسموح' }, { status: 400 })
  }

  const note = await db.voiceNote.findUnique({
    where: { id: voiceNoteId },
    select: { id: true, userId: true },
  })
  if (!note) {
    return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  }

  // Validate parent comment if provided
  let parentOwnerId: string | null = null
  if (parentId) {
    const parent = await db.comment.findUnique({
      where: { id: parentId },
      select: { id: true, userId: true, voiceNoteId: true },
    })
    if (!parent || parent.voiceNoteId !== voiceNoteId) {
      return NextResponse.json({ error: 'تعليق أصلي غير صالح' }, { status: 400 })
    }
    parentOwnerId = parent.userId
  }

  const comment = await db.comment.create({
    data: {
      userId: user.id,
      voiceNoteId,
      content: trimmed,
      parentId: parentId || null,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarColor: true,
        },
      },
    },
  })

  // Notify note owner (if not replying to own note) AND parent comment owner (if reply and not own comment)
  const notifTargets = new Set<string>()
  if (note.userId !== user.id && !parentId) {
    notifTargets.add(note.userId)
  }
  if (parentId && parentOwnerId && parentOwnerId !== user.id) {
    notifTargets.add(parentOwnerId)
  }

  if (notifTargets.size > 0) {
    await Promise.all(
      Array.from(notifTargets).map((recipientId) =>
        db.notification
          .create({
            data: {
              recipientId,
              actorId: user.id,
              type: parentId ? 'comment' : 'comment',
              voiceNoteId,
              commentId: comment.id,
              text: parentId
                ? `ردّ ${user.name} على تعليقك`
                : `علّق ${user.name} على صداك`,
              read: false,
            },
          })
          .catch(() => {})
      )
    )
  }

  return NextResponse.json({
    comment: {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      parentId: comment.parentId,
      user: comment.user,
      replies: [],
    },
  })
}

/**
 * DELETE /api/voice-notes/comments?id=xxx
 * Only the comment author can delete. Also deletes child replies.
 */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 })
  }
  const c = await db.comment.findUnique({ where: { id } })
  if (!c || c.userId !== user.id) {
    return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  }
  await db.comment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
