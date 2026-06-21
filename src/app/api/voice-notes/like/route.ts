import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/voice-notes/like
 * body: { id: string, action: 'like' | 'unlike' }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const body = await req.json()
  const { id, action } = body as { id?: string; action?: 'like' | 'unlike' }
  if (!id || !action) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  const note = await db.voiceNote.findUnique({
    where: { id },
    select: { id: true, userId: true },
  })
  if (!note) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  if (action === 'like') {
    try {
      await db.like.create({
        data: { userId: user.id, voiceNoteId: id },
      })
      // Notify note owner (don't notify self)
      if (note.userId !== user.id) {
        await db.notification.create({
          data: {
            recipientId: note.userId,
            actorId: user.id,
            type: 'like',
            voiceNoteId: id,
            text: `أعجب ${user.name} بصداك`,
            read: false,
          },
        }).catch(() => {})
      }
    } catch {
      // already liked
    }
  } else {
    await db.like.deleteMany({
      where: { userId: user.id, voiceNoteId: id },
    })
  }

  const likesCount = await db.like.count({ where: { voiceNoteId: id } })
  return NextResponse.json({ liked: action === 'like', likesCount })
}
