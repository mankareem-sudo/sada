import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/voice-notes/pin
 * body: { voiceNoteId, isPinned }
 *
 * Pin or unpin a voice note on the user's profile.
 * Only the voice note owner can pin their own notes.
 * Max 3 pinned notes per user.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const body = await req.json()
    const { voiceNoteId, isPinned } = body as {
      voiceNoteId?: string
      isPinned?: boolean
    }

    if (!voiceNoteId) {
      return NextResponse.json({ error: 'missing voiceNoteId' }, { status: 400 })
    }

    // Verify ownership
    const note = await db.voiceNote.findUnique({ where: { id: voiceNoteId } })
    if (!note) {
      return NextResponse.json({ error: 'الصدى مش موجود' }, { status: 404 })
    }

    if (note.userId !== user.id) {
      return NextResponse.json(
        { error: 'ما تقدرش تثبت صدى مش بتاعك' },
        { status: 403 }
      )
    }

    // If pinning, check max 3 pinned notes
    if (isPinned) {
      const currentPinned = await db.voiceNote.findMany({
        where: { userId: user.id, isPinned: true },
      })
      if ((currentPinned as any[]).length >= 3 && !note.isPinned) {
        return NextResponse.json(
          { error: 'تقدر تثبت 3 أصوات فقط على بروفايلك' },
          { status: 400 }
        )
      }
    }

    // Update pin status
    await db.voiceNote.update({
      where: { id: voiceNoteId },
      data: { isPinned: !!isPinned },
    })

    return NextResponse.json({
      ok: true,
      isPinned: !!isPinned,
    })
  } catch (e) {
    console.error('Pin voice note error', e)
    return NextResponse.json({ error: 'فشل تثبيت الصدى' }, { status: 500 })
  }
}
