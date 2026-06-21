import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/voice-notes/comments?voiceNoteId=xxx
 * Returns comments for a voice note.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const voiceNoteId = url.searchParams.get('voiceNoteId')
  if (!voiceNoteId) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 })
  }
  const comments = await db.comment.findMany({
    where: { voiceNoteId },
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
    take: 200,
  })
  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      user: c.user,
    })),
  })
}

/**
 * POST /api/voice-notes/comments
 * body: { voiceNoteId, content }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const body = await req.json()
  const { voiceNoteId, content } = body as {
    voiceNoteId?: string
    content?: string
  }

  if (!voiceNoteId || !content || !content.trim()) {
    return NextResponse.json({ error: 'محتاج محتوى' }, { status: 400 })
  }

  const trimmed = content.trim().slice(0, 500)
  if (trimmed.length < 1) {
    return NextResponse.json({ error: 'التعليق قصير جداً' }, { status: 400 })
  }

  const note = await db.voiceNote.findUnique({
    where: { id: voiceNoteId },
    select: { id: true, userId: true },
  })
  if (!note) {
    return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  }

  const comment = await db.comment.create({
    data: {
      userId: user.id,
      voiceNoteId,
      content: trimmed,
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

  // Notify note owner
  if (note.userId !== user.id) {
    await db.notification.create({
      data: {
        recipientId: note.userId,
        actorId: user.id,
        type: 'comment',
        voiceNoteId,
        commentId: comment.id,
        text: `علّق ${user.name} على صداك`,
        read: false,
      },
    }).catch(() => {})
  }

  return NextResponse.json({
    comment: {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      user: comment.user,
    },
  })
}

/**
 * DELETE /api/voice-notes/comments?id=xxx
 * Only the comment author can delete.
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
