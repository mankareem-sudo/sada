import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/users/me/voice-notes
 * Returns current user's voice notes for profile management.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const notes = await db.voiceNote.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      prompt: true,
      _count: { select: { likes: true } },
    },
  })

  return NextResponse.json({
    notes: notes.map((n) => ({
      id: n.id,
      durationSec: n.durationSec,
      mimeType: n.mimeType,
      audioData: n.audioData,
      transcript: n.transcript,
      plays: n.plays,
      createdAt: n.createdAt,
      likesCount: n._count.likes,
      prompt: n.prompt
        ? { id: n.prompt.id, text: n.prompt.text, date: n.prompt.date }
        : null,
    })),
  })
}

/**
 * DELETE /api/users/me/voice-notes?id=xxx
 */
export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 })
  }

  const note = await db.voiceNote.findUnique({ where: { id } })
  if (!note || note.userId !== user.id) {
    return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  }

  await db.voiceNote.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
